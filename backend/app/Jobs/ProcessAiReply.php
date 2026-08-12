<?php

namespace App\Jobs;

use App\Models\Chat;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessAiReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public function __construct(
        public int $chatId,
        public int $userId,
        public string $message,
    ) {}

    public function handle(): void
    {
        $chat = Chat::find($this->chatId);
        if (!$chat) {
            return;
        }

        // Per-chat gate: AI отвечает только когда чат в режиме ai
        if ((string) $chat->ai_mode !== 'ai' || (bool) $chat->ai_requires_human) {
            return;
        }

        $baseUrl = rtrim((string) config('services.ai_orchestrator.base_url', 'http://172.19.0.1:18080'), '/');
        $serviceKey = (string) config('services.ai_orchestrator.service_api_key', '');
        if ($serviceKey === '') {
            Log::warning('ProcessAiReply: service api key missing');
            return;
        }

        // Global gate: ИИ молчит только если платформа полностью выключена (off).
        // Явно переданный ИИ чат (ai_mode=ai) работает и в режимах suggest/auto.
        try {
            $settings = Http::timeout(10)->withHeaders(['X-API-Key' => $serviceKey])
                ->get($baseUrl . '/v1/ai-settings', ['contour' => 'it-velora'])->json();
            if (($settings['mode'] ?? 'off') === 'off') {
                return;
            }
        } catch (\Throwable $e) {
            Log::warning('ProcessAiReply: settings check failed: ' . $e->getMessage());
            return;
        }

        // Gate по уровню клиента: если заданы разрешённые уровни — работаем только с ними
        if (!(bool) \App\Models\AiLocalSetting::getValue('autonomy_enabled', true)) {
            return;
        }
        $allowedLevels = (array) \App\Models\AiLocalSetting::getValue('allowed_levels', []);
        if (!empty($allowedLevels)) {
            $user = \App\Models\User::find($this->userId);
            $level = $user ? (int) ($user->commission_level_id ?? 0) : 0;
            if (!in_array($level, array_map('intval', $allowedLevels), true)) {
                return;
            }
        }

        try {
            $resp = Http::timeout(90)->withHeaders(['X-API-Key' => $serviceKey])
                ->post($baseUrl . '/v1/manager/reply-sync', [
                    'chat_id' => $this->chatId,
                    'user_id' => $this->userId,
                    'message' => $this->message,
                    'contour' => 'it-velora',
                    'context' => $this->buildBusinessContext(),
                ]);
        } catch (\Throwable $e) {
            Log::error('ProcessAiReply: orchestrator call failed: ' . $e->getMessage());
            return;
        }

        if (!$resp->successful()) {
            Log::warning('ProcessAiReply: orchestrator status ' . $resp->status());
            return;
        }

        $data = $resp->json();
        $action = (string) ($data['action'] ?? 'respond');
        $text = trim((string) ($data['response'] ?? ''));

        if ($action === 'escalate' || ($data['escalation_id'] ?? null)) {
            // ИИ передал чат человеку
            $chat->ai_requires_human = true;
            $chat->save();
        }

        if ($action !== 'respond' || $text === '') {
            return;
        }

        // Проверяем, что клиент не написал новое сообщение пока ИИ думал
        $chat->refresh();
        if ((string) $chat->ai_mode !== 'ai') {
            return;
        }

        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $chat->manager_id,
            'message' => $text,
            'is_read' => true,
        ]);

        $chat->ai_last_reply_at = now();
        $chat->touch();
        $chat->save();

        \App\Events\ChatPing::safeDispatch((int) $chat->id);
    }

    /**
     * Business context for orchestrator: funnel stages, current stage, payment details.
     */
    private function buildBusinessContext(): array
    {
        $ctx = [];
        try {
            $user = \App\Models\User::find($this->userId);
            $levels = \App\Models\CommissionLevel::orderBy('order')->get();
            $iban = \App\Models\IbanSetting::query()->first();

            $ctx['funnel'] = $levels->map(fn ($l) => [
                'order' => (int) $l->order,
                'name' => (string) $l->name,
                'amount_eur' => (float) $l->amount,
                'purpose' => (string) ($l->description ?: ''),
            ])->values()->all();

            if ($user) {
                $current = $levels->firstWhere('id', (int) ($user->commission_level_id ?? 0));
                $next = $current
                    ? $levels->firstWhere('order', ((int) $current->order) + 1)
                    : $levels->first();
                $ctx['client'] = [
                    'name' => trim(($user->name ?? '') . ' ' . ($user->surname ?? '')),
                    'requested_amount_eur' => (float) ($user->requested_amount ?? 0),
                    'wizard_progress' => $user->wizard_progress,
                    'current_level_order' => $current ? (int) $current->order : 0,
                    'current_level_name' => $current ? (string) $current->name : 'nessuno',
                ];
                $stage = $current ?: $next;
                if ($stage) {
                    $ctx['current_stage'] = [
                        'order' => (int) $stage->order,
                        'name' => (string) $stage->name,
                        'amount_eur' => (float) $stage->amount,
                        'purpose' => (string) ($stage->description ?: ''),
                        'callout' => trim(($stage->callout_title ?? '') . '. ' . ($stage->callout_body ?? ''), '. '),
                        'help' => trim(($stage->help_modal_title ?? '') . '. ' . ($stage->help_modal_body ?? ''), '. '),
                    ];
                }
            }

            if ($iban) {
                $ctx['payment'] = [
                    'iban' => (string) ($iban->global_iban ?? ''),
                    'beneficiary' => (string) ($iban->beneficiary_name ?? ''),
                    'bic_swift' => (string) ($iban->bic_swift ?? ''),
                    'how_to' => (string) ($iban->payment_method_text ?? ''),
                ];
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProcessAiReply: buildBusinessContext failed: ' . $e->getMessage());
        }
        return $ctx;
    }
}
