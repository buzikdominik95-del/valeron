<?php

namespace App\Services\AiManager;

use App\Models\CommissionLevel;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClientContextBuilder
{
    /**
     * Real chat history as [{role, content}], oldest first.
     */
    public static function history(int $chatId, int $limit = 16): array
    {
        try {
            $rows = DB::table('chat_messages')
                ->where('chat_id', $chatId)
                ->whereIn('sender_type', ['user', 'manager'])
                ->orderByDesc('id')
                ->limit($limit)
                ->get(['sender_type', 'message']);
            $msgs = [];
            foreach ($rows->reverse() as $r) {
                $text = trim((string) $r->message);
                if ($text === '') { continue; }
                $msgs[] = [
                    'role' => $r->sender_type === 'user' ? 'user' : 'assistant',
                    'content' => mb_substr($text, 0, 2000),
                ];
            }
            return $msgs;
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder history failed: ' . $e->getMessage());
            return [];
        }
    }

    public static function build(int $userId): array
    {
        $ctx = [];

        $user = User::find($userId);
        if (!$user) {
            return $ctx;
        }

        $levels = collect();
        $current = null;
        try {
            $levels = CommissionLevel::orderBy('order')->get();
            $current = $user->commission_level_id
                ? $levels->firstWhere('id', $user->commission_level_id)
                : null;

            $ctx['funnel'] = $levels->map(fn ($l) => [
                'order' => (int) $l->order,
                'name' => $l->name,
                'amount' => (float) $l->amount,
                'is_current' => $current && $l->id === $current->id,
            ])->values()->all();

            $ctx['client'] = [
                'name' => $user->name,
                'level_order' => $current ? (int) $current->order : 0,
                'level_name' => $current ? $current->name : '?',
                'level_amount' => $current ? (float) $current->amount : 0.0,
                'requested_amount' => (float) ($user->requested_amount ?? 0),
                'wizard_progress' => $user->wizard_progress,
                'document_type' => $user->document_type ?? null,
                'document_number' => $user->document_number ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder funnel failed: ' . $e->getMessage());
        }

        $ctx['payments_made'] = [];
        $ctx['payments_pending'] = [];
        try {
            $paid = DB::table('payments')
                ->where('user_id', $userId)
                ->where('status', 'paid')
                ->orderBy('id')
                ->get();
            $ctx['payments_made'] = $paid->map(fn ($p) => [
                'amount' => (float) ($p->amount ?? 0),
                'description' => $p->description ?? '',
            ])->values()->all();

            $pending = DB::table('payments')
                ->where('user_id', $userId)
                ->where('status', 'pending')
                ->orderBy('id')
                ->get();
            $ctx['payments_pending'] = $pending->map(fn ($p) => [
                'amount' => (float) ($p->amount ?? 0),
                'description' => $p->description ?? '',
            ])->values()->all();
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder payments failed: ' . $e->getMessage());
        }

        try {
            if ($current && empty($ctx['payments_made']) && $levels->isNotEmpty()) {
                $completed = $levels->filter(fn ($l) => (int) $l->order < (int) $current->order);
                $ctx['payments_made'] = $completed->map(fn ($l) => [
                    'amount' => (float) $l->amount,
                    'description' => 'Commissione livello ' . $l->order . ' - ' . $l->name . ' (pagata)',
                ])->values()->all();
            }
            $ctx['total_paid_eur'] = array_sum(array_column($ctx['payments_made'], 'amount'));

            if ($current && $levels->isNotEmpty()) {
                $next = $levels->firstWhere('order', (int) $current->order + 1);
                if ($next) {
                    $ctx['next_stage'] = [
                        'order' => (int) $next->order,
                        'name' => $next->name,
                        'amount' => (float) $next->amount,
                    ];
                }
                $ctx['current_stage_amount'] = (float) $current->amount;
            }
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder stages failed: ' . $e->getMessage());
        }

        $ctx['documents'] = [];
        try {
            $docs = DB::table('documents')
                ->where('user_id', $userId)
                ->orderBy('id')
                ->get(['type', 'status']);

            $ctx['documents'] = $docs->map(fn ($d) => [
                'type' => $d->type ?? 'document',
                'status' => $d->status ?? 'unknown',
            ])->values()->all();

            $count = $docs->count();
            $rawProgress = $user->wizard_progress;
            $progress = is_array($rawProgress) ? $rawProgress : (json_decode((string) $rawProgress, true) ?: []);
            $fromProgress = !empty($progress['documents_verified']) || !empty($progress['documents_uploaded']);
            $hasProfileDoc = !empty(trim((string) ($user->document_type ?? ''))) && !empty(trim((string) ($user->document_number ?? '')));

            $uploaded = ($count > 0) || $fromProgress || $hasProfileDoc;
            $ctx['documents_uploaded'] = $uploaded;
            $ctx['documents_count'] = $count > 0 ? $count : ($uploaded ? 1 : 0);

            if ($uploaded && empty($ctx['documents'])) {
                $ctx['documents'][] = [
                    'type' => $user->document_type ?? 'identity_document',
                    'status' => 'uploaded_profile',
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder documents failed: ' . $e->getMessage());
            $ctx['documents_uploaded'] = false;
            $ctx['documents_count'] = 0;
        }

        try {
            if ($current && class_exists(\App\Models\IbanLevelSetting::class)) {
                $iban = \App\Models\IbanLevelSetting::resolveForLevel($current->id);
                if ($iban) {
                    $ctx['payment_details'] = [
                        'iban' => $iban->iban ?? null,
                        'beneficiary' => $iban->beneficiary ?? ($iban->holder ?? null),
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('ClientContextBuilder iban failed: ' . $e->getMessage());
        }

        return $ctx;
    }
}
