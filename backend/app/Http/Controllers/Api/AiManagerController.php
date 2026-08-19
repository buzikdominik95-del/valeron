<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiManagerController extends Controller
{
    private function baseUrl(): string
    {
        return rtrim((string) config('services.ai_orchestrator.base_url', 'http://172.19.0.1:18080'), '/');
    }

    private function apiKey(): string
    {
        return (string) config('services.ai_orchestrator.admin_api_key', '');
    }

    private function serviceApiKey(): string
    {
        return (string) config('services.ai_orchestrator.service_api_key', '');
    }

    private function timeout(): int
    {
        return (int) config('services.ai_orchestrator.timeout', 20);
    }

    private function proxy(string $method, string $path, array $query = [], array $payload = [], bool $useServiceKey = false): JsonResponse
    {
        $apiKey = $useServiceKey ? $this->serviceApiKey() : $this->apiKey();
        if ($apiKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'AI_ORCHESTRATOR_ADMIN_API_KEY is not configured',
            ], 500);
        }

        $url = $this->baseUrl() . '/' . ltrim($path, '/');
        if (!empty($query) && strtoupper($method) !== 'GET') {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
        }

        try {
            $request = Http::timeout($this->timeout())
                ->acceptJson()
                ->withHeaders([
                    'X-API-Key' => $apiKey,
                ]);

            $response = match (strtoupper($method)) {
                'GET' => $request->get($url, $query),
                'POST' => $request->post($url, $payload),
                'PUT' => $request->put($url, $payload),
                'PATCH' => $request->patch($url, $payload),
                'DELETE' => $request->delete($url, $payload),
                default => throw new \InvalidArgumentException('Unsupported method: ' . $method),
            };

            $body = $response->json();
            if (!is_array($body)) {
                $body = [
                    'raw' => $response->body(),
                ];
            }

            return response()->json([
                'success' => $response->successful(),
                'data' => $body,
                'status_code' => $response->status(),
            ], $response->status());
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'AI orchestrator request failed',
                'error' => $e->getMessage(),
            ], 502);
        }
    }

    public function healthSnapshot(): JsonResponse
    {
        return $this->proxy('GET', '/v1/admin/health-snapshot');
    }

    public function stats(): JsonResponse
    {
        return $this->proxy('GET', '/v1/admin/stats');
    }

    public function alertsRecent(Request $request): JsonResponse
    {
        $limit = max(1, min(200, (int) $request->query('limit', 50)));
        return $this->proxy('GET', '/v1/admin/alerts/recent', ['limit' => $limit]);
    }

    public function queueAging(): JsonResponse
    {
        return $this->proxy('GET', '/v1/admin/queue/aging');
    }

    public function sla(): JsonResponse
    {
        return $this->proxy('GET', '/v1/admin/sla');
    }

    public function escalations(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'pending');
        $limit = max(1, min(200, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        return $this->proxy('GET', '/v1/escalations', [
            'status' => $status,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    public function escalationsOverdue(Request $request): JsonResponse
    {
        $limit = max(1, min(200, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        return $this->proxy('GET', '/v1/escalations/overdue', [
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    public function assignEscalation(Request $request, int $id): JsonResponse
    {
        $payload = [
            'supervisor_id' => $request->input('supervisor_id'),
            'supervisor_name' => $request->input('supervisor_name'),
        ];

        return $this->proxy('POST', "/v1/escalations/{$id}/assign", [], $payload);
    }

    public function resolveEscalation(Request $request, int $id): JsonResponse
    {
        $payload = [
            'resolution_note' => (string) $request->input('resolution_note', 'resolved via admin ui'),
        ];

        return $this->proxy('POST', "/v1/escalations/{$id}/resolve", [], $payload);
    }

    public function bulkAssign(Request $request): JsonResponse
    {
        $payload = [
            'only_overdue' => (bool) $request->input('only_overdue', true),
            'limit' => max(1, min(500, (int) $request->input('limit', 100))),
        ];

        return $this->proxy('POST', '/v1/escalations/bulk-assign', [], $payload);
    }

    public function bulkResolve(Request $request): JsonResponse
    {
        $payload = [
            'only_overdue' => (bool) $request->input('only_overdue', true),
            'limit' => max(1, min(500, (int) $request->input('limit', 100))),
            'resolution_note' => (string) $request->input('resolution_note', 'bulk_resolved via admin ui'),
        ];

        return $this->proxy('POST', '/v1/escalations/bulk-resolve', [], $payload);
    }

    public function personas(Request $request): JsonResponse
    {
        $contour = $request->query('contour');
        $query = [];
        if (is_string($contour) && $contour !== '') {
            $query['contour'] = $contour;
        }

        return $this->proxy('GET', '/v1/personas', $query, [], true);
    }

    public function createPersona(Request $request): JsonResponse
    {
        $payload = $request->only(['name', 'role', 'contour', 'legend', 'style_guide', 'system_prompt']);
        return $this->proxy('POST', '/v1/personas', [], $payload, true);
    }

    public function updatePersona(Request $request, int $id): JsonResponse
    {
        $payload = $request->only(['name', 'role', 'contour', 'legend', 'style_guide', 'system_prompt']);
        return $this->proxy('PUT', "/v1/personas/{$id}", [], $payload, true);
    }

    public function deletePersona(Request $request, int $id): JsonResponse
    {
        $query = $request->boolean('force') ? ['force' => 1] : [];
        return $this->proxy('DELETE', "/v1/personas/{$id}", $query, [], true);
    }

    public function chatState(int $id): JsonResponse
    {
        $chat = \App\Models\Chat::find($id);
        if (!$chat) {
            return response()->json(['success' => false, 'message' => 'chat_not_found'], 404);
        }
        return response()->json([
            'success' => true,
            'data' => [
                'chat_id' => (int) $chat->id,
                'user_id' => (int) $chat->user_id,
                'ai_mode' => (string) ($chat->ai_mode ?? 'human'),
                'ai_requires_human' => (bool) $chat->ai_requires_human,
                'ai_last_reply_at' => $chat->ai_last_reply_at,
            ],
        ]);
    }

    public function takeover(int $id): JsonResponse
    {
        $chat = \App\Models\Chat::find($id);
        if (!$chat) {
            return response()->json(['success' => false, 'message' => 'chat_not_found'], 404);
        }
        $chat->ai_mode = 'human';
        $chat->ai_requires_human = false;
        $chat->save();
        return response()->json(['success' => true, 'data' => ['chat_id' => (int) $chat->id, 'ai_mode' => 'human']]);
    }

    public function returnToAi(int $id): JsonResponse
    {
        $chat = \App\Models\Chat::find($id);
        if (!$chat) {
            return response()->json(['success' => false, 'message' => 'chat_not_found'], 404);
        }
        $chat->ai_mode = 'ai';
        $chat->ai_requires_human = false;
        $chat->save();

        // Мгновенный запуск: ИИ сразу анализирует последнее сообщение клиента и отвечает
        $dispatched = false;
        $lastClientMsg = $chat->messages()->where('sender_type', '!=', 'manager')->orderByDesc('id')->first();
        if ($lastClientMsg && trim((string) $lastClientMsg->message) !== '') {
            \App\Jobs\ProcessAiReply::dispatch((int) $chat->id, (int) $chat->user_id, (string) $lastClientMsg->message);
            $dispatched = true;
        }

        return response()->json(['success' => true, 'data' => ['chat_id' => (int) $chat->id, 'ai_mode' => 'ai', 'ai_processing' => $dispatched]]);
    }

    public function suggestReply(Request $request): JsonResponse
    {
        $chatId = (int) $request->input('chat_id');
        $userId = (int) $request->input('user_id', 0);
        if ($userId <= 0 && $chatId > 0) {
            $chat = \App\Models\Chat::find($chatId);
            $userId = $chat ? (int) $chat->user_id : 0;
        }
        $payload = [
            'chat_id' => $chatId,
            'user_id' => $userId,
            'message' => (string) $request->input('message', ''),
            'contour' => (string) $request->input('contour', 'it-velora'),
            'context' => \App\Services\AiManager\ClientContextBuilder::build($userId),
            'history' => \App\Services\AiManager\ClientContextBuilder::history($chatId),
        ];
        return $this->proxy('POST', '/v1/manager/reply-sync', [], $payload, true);
    }

    public function aiSettings(Request $request): JsonResponse
    {
        $contour = (string) $request->query('contour', 'it-velora');
        return $this->proxy('GET', '/v1/ai-settings', ['contour' => $contour], [], true);
    }

    public function saveAiSettings(Request $request): JsonResponse
    {
        $payload = $request->only(['contour', 'mode', 'human_delay_min_sec', 'human_delay_max_sec', 'confidence_threshold', 'working_hours', 'allowed_levels']);
        return $this->proxy('POST', '/v1/ai-settings', [], $payload, true);
    }
    // ===== Workflows (PHASE 8-9) =====

    public function workflows(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => \App\Models\AiWorkflow::orderByDesc('id')->get()]);
    }

    public function createWorkflow(Request $request): JsonResponse
    {
        $wf = \App\Models\AiWorkflow::create([
            'name' => (string) $request->input('name', 'Workflow'),
            'description' => (string) $request->input('description', ''),
            'trigger_type' => (string) $request->input('trigger_type', 'new_message'),
            'graph' => (array) $request->input('graph', ['nodes' => [], 'edges' => []]),
            'enabled' => (bool) $request->input('enabled', false),
        ]);
        return response()->json(['success' => true, 'data' => $wf]);
    }

    public function updateWorkflow(Request $request, int $id): JsonResponse
    {
        $wf = \App\Models\AiWorkflow::findOrFail($id);
        $wf->fill($request->only(['name', 'description', 'trigger_type', 'enabled']));
        if ($request->has('graph')) {
            $wf->graph = (array) $request->input('graph');
            $wf->version = $wf->version + 1;
        }
        $wf->save();
        return response()->json(['success' => true, 'data' => $wf]);
    }

    public function deleteWorkflow(int $id): JsonResponse
    {
        \App\Models\AiWorkflow::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    public function runWorkflow(Request $request, int $id): JsonResponse
    {
        $wf = \App\Models\AiWorkflow::findOrFail($id);
        $chat = null;
        if ($request->filled('chat_id')) {
            $chat = \App\Models\Chat::find((int) $request->input('chat_id'));
        }
        $context = [
            'last_message' => (string) $request->input('message', ''),
            'chat' => $chat ? ['id' => $chat->id, 'status' => $chat->status] : [],
            'client' => ($chat && $chat->user) ? ['id' => $chat->user->id, 'name' => $chat->user->name, 'email' => $chat->user->email] : [],
            'vars' => [],
        ];
        $run = \App\Models\AiWorkflowRun::create([
            'workflow_id' => $wf->id,
            'chat_id' => $chat?->id,
            'status' => 'queued',
            'context' => $context,
            'started_at' => now(),
        ]);
        \App\Jobs\ExecuteAiWorkflow::dispatch($run->id, null);
        return response()->json(['success' => true, 'data' => ['run_id' => $run->id]]);
    }

    public function workflowRuns(Request $request): JsonResponse
    {
        $q = \App\Models\AiWorkflowRun::with('workflow:id,name')->orderByDesc('id');
        if ($request->filled('workflow_id')) {
            $q->where('workflow_id', (int) $request->input('workflow_id'));
        }
        return response()->json(['success' => true, 'data' => $q->limit(100)->get()]);
    }

    // ===== Локальные настройки автономии (уровни клиентов и пр.) =====

    // ===== Persona <-> Chat assignment =====

    public function chatPersona(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $contour = (string) $request->query('contour', 'it-velora');
        return $this->proxy('GET', "/v1/chat/{$id}/persona", ['contour' => $contour], [], true);
    }

    public function setChatPersona(\Illuminate\Http\Request $request, int $id): JsonResponse
    {
        $payload = [
            'contour' => (string) $request->input('contour', 'it-velora'),
            'persona_id' => (int) $request->input('persona_id'),
        ];
        return $this->proxy('POST', "/v1/chat/{$id}/persona", [], $payload, true);
    }

    // ===== Client memory card =====

    public function clientCard(int $userId): JsonResponse
    {
        $ctx = \App\Services\AiManager\ClientContextBuilder::build($userId);
        $user = \App\Models\User::find($userId);

        // last actions from chat history
        $lastMessages = \Illuminate\Support\Facades\DB::table('chat_messages as m')
            ->join('chats as c', 'c.id', '=', 'm.chat_id')
            ->where('c.user_id', $userId)
            ->orderByDesc('m.id')
            ->limit(5)
            ->get(['m.sender_type', 'm.message', 'm.created_at']);

        // AI memory from orchestrator
        $memory = [];
        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(5)
                ->withHeaders(['X-API-Key' => $this->serviceApiKey()])
                ->get($this->baseUrl() . "/v1/tools/memory/{$userId}");
            if ($resp->ok()) { $memory = $resp->json('memory') ?? []; }
        } catch (\Throwable $e) {}

        // assigned persona (via latest chat)
        $persona = null;
        try {
            $chat = \Illuminate\Support\Facades\DB::table('chats')->where('user_id', $userId)->orderByDesc('id')->first();
            if ($chat) {
                $resp = \Illuminate\Support\Facades\Http::timeout(5)
                    ->withHeaders(['X-API-Key' => $this->serviceApiKey()])
                    ->get($this->baseUrl() . "/v1/chat/{$chat->id}/persona");
                if ($resp->ok()) { $persona = $resp->json('persona'); }
            }
        } catch (\Throwable $e) {}

        return response()->json(['success' => true, 'data' => [
            'client' => [
                'id' => $userId,
                'name' => $user?->name,
                'email' => $user?->email,
                'country' => $user?->country ?? 'Italy',
                'stage' => $ctx['client']['level_name'] ?? null,
                'stage_order' => $ctx['client']['level_order'] ?? null,
                'requested_amount' => $ctx['client']['requested_amount'] ?? null,
            ],
            'manager_persona' => $persona,
            'payments' => [
                'made' => $ctx['payments_made'] ?? [],
                'pending' => $ctx['payments_pending'] ?? [],
                'total_paid_eur' => $ctx['total_paid_eur'] ?? 0,
                'next_stage' => $ctx['next_stage'] ?? null,
            ],
            'documents' => $ctx['documents'] ?? [],
            'last_actions' => $lastMessages,
            'ai_memory' => $memory,
        ]]);
    }

    public function localSettings(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => [
            'allowed_levels' => \App\Models\AiLocalSetting::getValue('allowed_levels', []),
            'autonomy_enabled' => (bool) \App\Models\AiLocalSetting::getValue('autonomy_enabled', true),
        ]]);
    }

    public function saveLocalSettings(Request $request): JsonResponse
    {
        if ($request->has('allowed_levels')) {
            $levels = array_values(array_unique(array_map('intval', (array) $request->input('allowed_levels', []))));
            \App\Models\AiLocalSetting::setValue('allowed_levels', $levels);
            // Sync to orchestrator gate: empty list = all levels
            try {
                $csv = empty($levels) ? 'all' : implode(',', $levels);
                $this->proxy('POST', '/v1/ai-settings', [], ['contour' => 'it-velora', 'allowed_levels' => $csv], true);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('allowed_levels sync failed: ' . $e->getMessage());
            }
        }
        if ($request->has('autonomy_enabled')) {
            \App\Models\AiLocalSetting::setValue('autonomy_enabled', (bool) $request->input('autonomy_enabled'));
        }
        return $this->localSettings();
    }


}
