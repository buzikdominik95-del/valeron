<?php

namespace App\Services\AiManager;

use App\Models\AiWorkflow;
use App\Models\AiWorkflowRun;
use App\Models\Chat;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WorkflowEngine
{
    private const MAX_STEPS = 50;

    public function resume(AiWorkflowRun $run, ?string $fromNodeId = null): void
    {
        $run->refresh();
        $workflow = $run->workflow;
        $graph = $workflow->graph ?? [];
        $nodes = collect($graph['nodes'] ?? [])->keyBy('id');
        $edges = collect($graph['edges'] ?? []);

        $nodeId = $fromNodeId;
        if ($nodeId === null) {
            $trigger = $nodes->first(fn ($n) => ($n['type'] ?? '') === 'trigger');
            if (!$trigger) {
                $this->fail($run, 'no_trigger_node');
                return;
            }
            $nodeId = $this->nextNode($edges, $trigger['id']);
        }

        $context = $run->context ?? [];
        $steps = 0;

        while ($nodeId !== null && $steps < self::MAX_STEPS) {
            $steps++;
            $node = $nodes->get($nodeId);
            if (!$node) {
                $this->fail($run, 'node_not_found: ' . $nodeId);
                return;
            }

            $run->current_node = $nodeId;
            $run->context = $context;
            $run->save();

            $type = (string) ($node['type'] ?? '');
            $cfg = (array) ($node['data'] ?? []);

            try {
                switch ($type) {
                    case 'ai_message':
                        $this->execAiMessage($run, $cfg, $context);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'condition':
                        $result = $this->execCondition($cfg, $context);
                        $nodeId = $this->nextNode($edges, $nodeId, $result ? 'yes' : 'no');
                        break;
                    case 'wait':
                        $minutes = max(1, (int) ($cfg['minutes'] ?? 10));
                        $next = $this->nextNode($edges, $nodeId);
                        $run->status = 'waiting';
                        $run->context = $context;
                        $run->save();
                        \App\Jobs\ExecuteAiWorkflow::dispatch($run->id, $next)->delay(now()->addMinutes($minutes));
                        return;
                    case 'update_client':
                        $this->execUpdateClient($run, $cfg);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'assign_manager':
                        $this->execAssignManager($run, $cfg);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'human_handoff':
                        $this->execHandoff($run);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'http_request':
                        $context = $this->execHttp($cfg, $context);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'knowledge_search':
                        $context = $this->execKnowledge($cfg, $context);
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'set_variable':
                        $key = (string) ($cfg['key'] ?? '');
                        if ($key !== '') {
                            Arr::set($context, 'vars.' . $key, $this->interpolate((string) ($cfg['value'] ?? ''), $context));
                        }
                        $nodeId = $this->nextNode($edges, $nodeId);
                        break;
                    case 'end':
                        $this->finish($run, $context);
                        return;
                    default:
                        $nodeId = $this->nextNode($edges, $nodeId);
                }
            } catch (\Throwable $e) {
                Log::error('WorkflowEngine node error: ' . $e->getMessage());
                $this->fail($run, $type . ': ' . $e->getMessage());
                return;
            }
        }

        $this->finish($run, $context);
    }

    private function nextNode($edges, string $fromId, ?string $handle = null): ?string
    {
        $edge = $edges->first(function ($e) use ($fromId, $handle) {
            if (($e['source'] ?? null) !== $fromId) {
                return false;
            }
            if ($handle !== null) {
                return (($e['sourceHandle'] ?? null) === $handle);
            }
            return true;
        });
        return $edge['target'] ?? null;
    }

    private function orchestrator(): array
    {
        return [
            rtrim((string) config('services.ai_orchestrator.base_url', 'http://172.19.0.1:18080'), '/'),
            (string) config('services.ai_orchestrator.service_api_key', ''),
        ];
    }

    private function execAiMessage(AiWorkflowRun $run, array $cfg, array $context): void
    {
        $chat = $run->chat_id ? Chat::find($run->chat_id) : null;
        if (!$chat) {
            return;
        }

        [$base, $key] = $this->orchestrator();
        $message = $this->interpolate((string) ($cfg['prompt'] ?? ''), $context);
        if ($message === '') {
            $message = (string) Arr::get($context, 'last_message', '');
        }
        if ($message === '') {
            return;
        }

        $resp = Http::timeout(90)->withHeaders(['X-API-Key' => $key])
            ->post($base . '/v1/manager/reply-sync', [
                'chat_id' => (int) $chat->id,
                'user_id' => (int) $chat->user_id,
                'message' => $message,
                'contour' => 'it-velora',
            ]);

        $text = trim((string) ($resp->json()['response'] ?? ''));
        if ($text !== '') {
            $chat->messages()->create([
                'sender_type' => 'manager',
                'sender_id' => $chat->manager_id,
                'message' => $text,
                'is_read' => true,
            ]);
            $chat->touch();
            \App\Events\ChatPing::safeDispatch((int) $chat->id);
        }
    }

    private function execCondition(array $cfg, array $context): bool
    {
        $left = (string) Arr::get($context, (string) ($cfg['left'] ?? ''), '');
        $op = (string) ($cfg['op'] ?? '==');
        $right = (string) ($cfg['right'] ?? '');

        return match ($op) {
            '==' => (string) $left === $right,
            '!=' => (string) $left !== $right,
            'contains' => str_contains(mb_strtolower((string) $left), mb_strtolower($right)),
            '>' => (float) $left > (float) $right,
            '<' => (float) $left < (float) $right,
            default => false,
        };
    }

    private function execUpdateClient(AiWorkflowRun $run, array $cfg): void
    {
        $chat = $run->chat_id ? Chat::find($run->chat_id) : null;
        if (!$chat) {
            return;
        }
        $allowed = ['status'];
        $field = (string) ($cfg['field'] ?? '');
        if (in_array($field, $allowed, true)) {
            $chat->{$field} = (string) ($cfg['value'] ?? '');
            $chat->save();
        }
    }

    private function execAssignManager(AiWorkflowRun $run, array $cfg): void
    {
        $chat = $run->chat_id ? Chat::find($run->chat_id) : null;
        $managerId = (int) ($cfg['manager_id'] ?? 0);
        if ($chat && $managerId > 0) {
            $chat->manager_id = $managerId;
            $chat->save();
        }
    }

    private function execHandoff(AiWorkflowRun $run): void
    {
        $chat = $run->chat_id ? Chat::find($run->chat_id) : null;
        if ($chat) {
            $chat->ai_mode = 'human';
            $chat->ai_requires_human = true;
            $chat->save();
        }
    }

    private function execHttp(array $cfg, array $context): array
    {
        $url = (string) ($cfg['url'] ?? '');
        $allow = array_filter(array_map('trim', explode(',', (string) env('AI_WORKFLOW_HTTP_ALLOWLIST', ''))));
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host || (!empty($allow) && !in_array($host, $allow, true))) {
            throw new \RuntimeException('http_host_not_allowed');
        }
        $method = strtoupper((string) ($cfg['method'] ?? 'GET'));
        $resp = $method === 'POST'
            ? Http::timeout(20)->post($url, (array) ($cfg['body'] ?? []))
            : Http::timeout(20)->get($url);
        Arr::set($context, 'vars.http_status', $resp->status());
        Arr::set($context, 'vars.http_body', mb_substr($resp->body(), 0, 2000));
        return $context;
    }

    private function execKnowledge(array $cfg, array $context): array
    {
        [$base, $key] = $this->orchestrator();
        $query = $this->interpolate((string) ($cfg['query'] ?? ''), $context);
        if ($query === '') {
            $query = (string) Arr::get($context, 'last_message', '');
        }
        $resp = Http::timeout(20)->withHeaders(['X-API-Key' => $key])
            ->get($base . '/v1/tools/search-knowledge', ['query' => $query, 'limit' => 3]);
        Arr::set($context, 'vars.knowledge', $resp->json()['results'] ?? []);
        return $context;
    }

    private function interpolate(string $template, array $context): string
    {
        return preg_replace_callback('/\{\{\s*([\w.]+)\s*\}\}/', function ($m) use ($context) {
            $v = Arr::get($context, $m[1], '');
            return is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE);
        }, $template) ?? $template;
    }

    private function finish(AiWorkflowRun $run, array $context): void
    {
        $run->status = 'finished';
        $run->context = $context;
        $run->finished_at = now();
        $run->save();
    }

    private function fail(AiWorkflowRun $run, string $error): void
    {
        $run->status = 'failed';
        $run->error = mb_substr($error, 0, 1000);
        $run->finished_at = now();
        $run->save();
    }
}
