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

        // Gate 1: чат взят человеком — ИИ молчит всегда, даже при override.
        if ((bool) $chat->ai_requires_human) {
            return;
        }

        // Gate 2: чат должен быть переведён на ИИ.
        if ((string) $chat->ai_mode !== 'ai') {
            return;
        }

        // Per-chat override: игнорировать глобальные рубильники для этого чата.
        $forced = (bool) ($chat->ai_forced ?? false);

        $baseUrl = rtrim((string) config('services.ai_orchestrator.base_url', 'http://172.19.0.1:18080'), '/');
        $serviceKey = (string) config('services.ai_orchestrator.service_api_key', '');
        if ($serviceKey === '') {
            Log::warning('ProcessAiReply: service api key missing');
            return;
        }

        // Global gates: пропускаются, если для чата включён per-chat override.
        if (!$forced) {
            // Глобальный режим платформы (оркестратор).
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

            // Глобальный рубильник автономной работы (Laravel).
            if (!(bool) \App\Models\AiLocalSetting::getValue('autonomy_enabled', true)) {
                return;
            }

            // Gate по уровню клиента: если заданы разрешённые уровни — работаем только с ними.
            $allowedLevels = (array) \App\Models\AiLocalSetting::getValue('allowed_levels', []);
            if (!empty($allowedLevels)) {
                $user = \App\Models\User::find($this->userId);
                $level = $user ? (int) ($user->commission_level_id ?? 0) : 0;
                if (!in_array($level, array_map('intval', $allowedLevels), true)) {
                    return;
                }
            }
        }

        // Payment image analysis: if last user message has an image attachment, analyze it
        $paymentAnalysis = $this->analyzeLastPaymentImage($baseUrl, $serviceKey);

        $context = \App\Services\AiManager\ClientContextBuilder::build($this->userId);
        if ($paymentAnalysis !== null) {
            $context['payment_image_analysis'] = $paymentAnalysis;
        }

        // Greeting state: static Deborah welcome messages are already in the chat.
        // AI must not introduce itself or greet again.
        $context = array_merge($context, \App\Services\AiManager\ClientContextBuilder::greeting($this->chatId));

        // Goal reached: client confirmed the level-1 commission payment.
        // Hand the chat over to a human for verification instead of replying.
        if ($paymentAnalysis !== null && $this->handlePaymentConfirmation($chat, $paymentAnalysis)) {
            return;
        }

        try {
            $resp = Http::timeout(90)->withHeaders(['X-API-Key' => $serviceKey])
                ->post($baseUrl . '/v1/manager/reply-sync', [
                    'chat_id' => $this->chatId,
                    'user_id' => $this->userId,
                    'message' => $this->message,
                    'contour' => 'it-velora',
                    'context' => $context,
                    'history' => \App\Services\AiManager\ClientContextBuilder::history($this->chatId),
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
        if ((string) $chat->ai_mode !== 'ai' || (bool) $chat->ai_requires_human) {
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
    /**
     * Analyze last user image attachment for payment proof via orchestrator VL model.
     */
    private function analyzeLastPaymentImage(string $baseUrl, string $serviceKey): ?array
    {
        try {
            $lastMsg = \App\Models\ChatMessage::where('chat_id', $this->chatId)
                ->where('sender_type', 'user')
                ->whereNotNull('attachment_url')
                ->where(function ($q) {
                    $q->where('attachment_kind', 'image')
                      ->orWhere('attachment_mime', 'application/pdf')
                      ->orWhere('attachment_url', 'like', '%.pdf');
                })
                ->orderByDesc('id')
                ->first();

            if (!$lastMsg) {
                return null;
            }

            $attachmentUrl = trim((string) ($lastMsg->attachment_url ?? ''));
            if ($attachmentUrl === '') {
                return null;
            }

            $relativePath = ltrim(parse_url($attachmentUrl, PHP_URL_PATH) ?? '', '/');
            $storagePath = str_replace('storage/', '', $relativePath);
            $fullPath = storage_path('app/public/' . $storagePath);

            if (!is_file($fullPath)) {
                return null;
            }

            $mime = strtolower(trim((string) ($lastMsg->attachment_mime ?? 'image/jpeg')));
            $isPdf = ($mime === 'application/pdf')
                || (strtolower(pathinfo($fullPath, PATHINFO_EXTENSION)) === 'pdf');

            if ($isPdf) {
                $converted = $this->convertPdfToJpeg($fullPath);
                if ($converted === null) {
                    Log::warning('ProcessAiReply: pdf to jpeg conversion failed', ['path' => $fullPath]);
                    return null;
                }
                $fullPath = $converted;
                $mime = 'image/jpeg';
            } elseif (!in_array($mime, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], true)) {
                $mime = 'image/jpeg';
            }

            $imageBase64 = base64_encode(file_get_contents($fullPath));
            if ($isPdf && is_file($fullPath)) {
                @unlink($fullPath);
            }
            if (strlen($imageBase64) < 128) {
                return null;
            }

            $resp = Http::timeout(90)->withHeaders(['X-API-Key' => $serviceKey])
                ->post($baseUrl . '/v1/chat/analyze-payment-image', [
                    'image_base64' => $imageBase64,
                    'mime_type' => $mime,
                    'chat_id' => $this->chatId,
                    'user_id' => $this->userId,
                ]);

            if (!$resp->successful()) {
                Log::warning('ProcessAiReply: payment image analysis failed: status ' . $resp->status());
                return null;
            }

            $data = $resp->json();
            $result = $data['result'] ?? null;
            if (!is_array($result)) {
                return null;
            }

            Log::info('payment_image_analyzed', [
                'chat_id' => $this->chatId,
                'message_id' => $lastMsg->id,
                'is_payment_proof' => $result['is_payment_proof'] ?? false,
                'amount' => $result['amount'] ?? null,
                'currency' => $result['currency'] ?? null,
                'confidence' => $result['confidence'] ?? 0,
            ]);

            return $result;
        } catch (\Throwable $e) {
            Log::warning('ProcessAiReply: payment image analysis error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Convert first page of a PDF to JPEG for the vision model.
     * Returns path to a temporary JPEG file, or null on failure.
     */
    private function convertPdfToJpeg(string $pdfPath): ?string
    {
        try {
            $tmpPrefix = sys_get_temp_dir() . '/aipay_' . uniqid('', true);
            $jpeg = $tmpPrefix . '.jpg';

            $cmd = sprintf(
                'pdftoppm -jpeg -r 150 -f 1 -l 1 -singlefile %s %s 2>&&1',
                escapeshellarg($pdfPath),
                escapeshellarg($tmpPrefix)
            );
            $out = [];
            $code = 1;
            @exec($cmd, $out, $code);

            if ($code === 0 && is_file($jpeg) && filesize($jpeg) > 1024) {
                return $jpeg;
            }

            if (class_exists('Imagick')) {
                $im = new \Imagick();
                $im->setResolution(150, 150);
                $im->readImage($pdfPath . '[0]');
                $im->setImageFormat('jpeg');
                $im->setImageCompressionQuality(85);
                $im->writeImage($jpeg);
                $im->clear();
                if (is_file($jpeg) && filesize($jpeg) > 1024) {
                    return $jpeg;
                }
            }

            Log::warning('ProcessAiReply: pdftoppm failed', [
                'code' => $code,
                'out' => implode(' ', array_slice((array) $out, 0, 3)),
            ]);
            return null;
        } catch (\Throwable $e) {
            Log::warning('ProcessAiReply: pdf convert error: ' . $e->getMessage());
            return null;
        }
    }

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
                $clientLevelOrder = 1;
                if (isset($ctx['client']['current_level_order'])) {
                    $clientLevelOrder = max(1, (int) $ctx['client']['current_level_order']);
                }
                $levelCoords = \App\Models\IbanLevelSetting::resolveForLevel($clientLevelOrder, $iban);
                $ctx['payment'] = [
                    'iban' => $levelCoords['iban'],
                    'beneficiary' => $levelCoords['beneficiary'],
                    'bic_swift' => $levelCoords['swift'],
                    'how_to' => (string) ($iban->payment_method_text ?? ''),
                ];
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ProcessAiReply: buildBusinessContext failed: ' . $e->getMessage());
        }
        return $ctx;
    }

    /**
     * If the attached image proves the level-1 commission payment, move the chat
     * to the manual review folder and stop AI autoreplies for it.
     *
     * Returns true when the chat was handed over (AI must stay silent).
     */
    private function handlePaymentConfirmation(\App\Models\Chat $chat, array $analysis): bool
    {
        try {
            if (empty($analysis['is_payment_proof'])) {
                return false;
            }

            $status = strtolower(trim((string) ($analysis['status'] ?? '')));
            if (in_array($status, ['failed', 'pending'], true)) {
                return false;
            }

            $minConfidence = (float) \App\Models\AiLocalSetting::getValue('payment_min_confidence', 0.6);
            if ((float) ($analysis['confidence'] ?? 0) < $minConfidence) {
                return false;
            }

            // Expected amount comes from the level-1 commission, never hardcoded.
            $level = \App\Models\CommissionLevel::where('order', 1)->first();
            $expected = $level ? (float) $level->amount : 0.0;
            if ($expected <= 0) {
                return false;
            }

            $amount = $analysis['amount'] ?? null;
            if ($amount === null) {
                return false;
            }
            $amount = (float) $amount;

            $currency = strtoupper(trim((string) ($analysis['currency'] ?? 'EUR')));
            $currency = str_replace(['\u{20ac}', 'EURO', 'EUR.'], 'EUR', $currency);
            if ($currency !== '' && $currency !== 'EUR') {
                return false;
            }

            // 2% tolerance for rounding/fees in the receipt.
            $tolerance = max(1.0, $expected * 0.02);
            if (abs($amount - $expected) > $tolerance) {
                return false;
            }

            $this->moveChatToPaymentReview($chat, $amount, $expected, (float) ($analysis['confidence'] ?? 0));
            return true;
        } catch (\Throwable $e) {
            Log::warning('ProcessAiReply: payment confirmation failed: ' . $e->getMessage());
            return false;
        }
    }

    private function moveChatToPaymentReview(\App\Models\Chat $chat, float $amount, float $expected, float $confidence): void
    {
        $tagName = (string) \App\Models\AiLocalSetting::getValue('payment_review_tag', 'ОПЛАТА НА ПРОВЕРКЕ');

        $tag = \App\Models\Tag::whereRaw('LOWER(name) = ?', [mb_strtolower($tagName)])->first();
        if ($tag) {
            $chat->tags()->syncWithoutDetaching([$tag->id]);
        } else {
            Log::warning('ProcessAiReply: payment review tag missing', ['tag' => $tagName]);
        }

        // Goal reached -> a human must verify the payment.
        $chat->ai_mode = 'human';
        $chat->ai_forced = false;
        $chat->ai_requires_human = true;
        $chat->save();

        Log::info('ai_payment_confirmed_handoff', [
            'chat_id' => (int) $chat->id,
            'user_id' => (int) $chat->user_id,
            'amount' => $amount,
            'expected' => $expected,
            'confidence' => $confidence,
            'tag' => $tagName,
        ]);

        \App\Events\ChatPing::safeDispatch((int) $chat->id);
    }
}
