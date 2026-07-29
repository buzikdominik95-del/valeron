<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminChatsController extends Controller
{
    public function index()
    {
        $chats = Chat::with(['user', 'tags:id'])
            ->select([
                'chats.*',
                DB::raw('(SELECT message FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg'),
                DB::raw('(SELECT created_at FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg_time'),
                DB::raw('(SELECT iban FROM ibans WHERE user_id = chats.user_id ORDER BY is_default DESC, updated_at DESC, id DESC LIMIT 1) as lead_iban'),
                DB::raw('(SELECT COUNT(*) FROM documents WHERE user_id = chats.user_id) as documents_count'),
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn (Chat $chat) => $this->mapChatData($chat));

        return response()
            ->json([
                'success' => true,
                'data' => $chats,
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function show($id)
    {
        $chat = Chat::with(['user', 'tags:id'])->findOrFail($id);

        $leadProfile = $this->resolveLeadProfileForUser((int) $chat->user_id, $chat->user->email ?? null);

        $leadIban = $this->resolveLeadIbanForUser((int) $chat->user_id, $leadProfile);

        $documentsCount = (int) DB::table('documents')
            ->where('user_id', $chat->user_id)
            ->count();

        $loanTermMonths = $this->resolveLoanTermMonthsForUser((int) $chat->user_id, $chat->user->wizard_progress ?? null, $leadProfile);

        $resolvedLeadName = $this->resolveLeadName($chat->user, $leadProfile);
        $resolvedLeadEmail = $this->resolveLeadEmail($chat->user, $leadProfile);
        $resolvedLoanAmount = $this->resolveLoanAmount($chat->user, $leadProfile);
        $resolvedDocumentNumber = $this->resolveDocumentNumber($chat->user, $leadProfile);

        return response()->json([
            'success' => true,
            'data' => [
                'chat' => [
                    'id' => $chat->id,
                    'lead_name' => $resolvedLeadName,
                    'lead_email' => $resolvedLeadEmail,
                    'loan_amount' => $resolvedLoanAmount,
                    'loan_term_months' => $loanTermMonths,
                    'lead_iban' => $leadIban,
                    'documents_uploaded' => $documentsCount > 0,
                    'documents_count' => $documentsCount,
                    'chat_created_at' => $chat->created_at,
                    'document_type' => $chat->user->document_type ?? null,
                    'document_number' => $resolvedDocumentNumber,
                    'stage_id' => null,
                    'manager_id' => $chat->manager_id,
                    'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
                    'unread_count' => $this->countUnreadClientMessages((int) $chat->id),
                    'notes' => '',
                ],
                'tags' => $chat->tags->pluck('id')->values(),
            ],
        ]);
    }

    public function messages($chatId)
    {
        $chat = Chat::findOrFail($chatId);
        $messages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                $isManager = false;
                if (($msg->sender_type ?? null) === 'manager') {
                    $isManager = true;
                }
                if ((bool) ($msg->is_manager ?? false)) {
                    $isManager = true;
                }

                return [
                    'id' => $msg->id,
                    'message' => $msg->message,
                    'is_manager' => $isManager,
                    'sender_name' => $isManager ? 'Менеджер' : 'Клиент',
                    'created_at' => $msg->created_at,
                    'is_read' => (bool) ($msg->is_read ?? false),
                ];
            });

        return response()
            ->json([
                'success' => true,
                'data' => $messages,
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function sendMessage(Request $request, $chatId)
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $chat = Chat::findOrFail($chatId);

        $message = $chat->messages()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'manager',
            'sender_id' => 1,
            'message' => $request->message,
            'is_read' => true,
            'read_at' => now(),
        ]);

        DB::table('chat_messages')
            ->where('chat_id', $chat->id)
            ->where('sender_type', '!=', 'manager')
            ->where(function ($q) {
                $q->whereNull('is_read');
                $q->orWhere('is_read', false);
            })
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        $chat->update([
            'last_message_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $message->id,
                'message' => $message->message,
                'is_manager' => true,
                'sender_name' => 'Менеджер',
                'created_at' => $message->created_at,
            ],
        ]);
    }

    public function updateMeta(Request $request, $chatId)
    {
        $chat = Chat::with('user')->findOrFail($chatId);

        $validated = $request->validate([
            'tags' => 'sometimes|array',
            'tags.*' => 'integer|exists:tags,id',
            'commission_level' => 'sometimes|integer|min:1',
            'notes' => 'sometimes|nullable|string|max:5000',
        ]);

        if (array_key_exists('tags', $validated)) {
            $chat->tags()->sync($validated['tags'] ?? []);
        }

        if (array_key_exists('commission_level', $validated)) {
            if ($chat->user) {
                $chat->user->commission_level_id = (int) $validated['commission_level'];
                $chat->user->save();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tags' => $chat->tags()->pluck('tags.id')->values(),
                'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
            ],
        ]);
    }

    private function mapChatData(Chat $chat): array
    {
        $user = $chat->user;
        $unreadCount = $this->countUnreadClientMessages((int) $chat->id);
        $documentsCount = (int) ($chat->documents_count ?? 0);
        $leadProfile = $this->resolveLeadProfileForUser((int) $chat->user_id, $chat->user->email ?? null);

        return [
            'id' => $chat->id,
            'lead_name' => $this->resolveLeadName($user, $leadProfile),
            'lead_email' => $this->resolveLeadEmail($user, $leadProfile),
            'loan_amount' => $this->resolveLoanAmount($user, $leadProfile),
            'loan_term_months' => $this->resolveLoanTermMonthsForUser((int) $chat->user_id, $user->wizard_progress ?? null, $leadProfile),
            'lead_iban' => $chat->lead_iban ?: $this->resolveLeadIbanForUser((int) $chat->user_id, $leadProfile),
            'documents_uploaded' => $documentsCount > 0,
            'documents_count' => $documentsCount,
            'chat_created_at' => $chat->created_at,
            'document_type' => $user->document_type ?? null,
            'document_number' => $this->resolveDocumentNumber($user, $leadProfile),
            'last_msg' => $chat->last_msg,
            'status' => $chat->status,
            'unread_count' => $unreadCount,
            'has_unread_messages' => $unreadCount > 0,
            'stage_name' => null,
            'tags' => $chat->tags->pluck('id')->values(),
            'commission_level' => (int) ($user->commission_level_id ?? 1),
            'updated_at' => $chat->last_msg_time ?? $chat->updated_at,
        ];
    }

    private function extractLoanTermMonths($wizardProgress): ?int
    {
        if (is_array($wizardProgress)) {
            $data = $wizardProgress;
        } else {
            $decoded = json_decode((string) ($wizardProgress ?? ''), true);
            $data = is_array($decoded) ? $decoded : [];
        }

        $paths = [
            'loan_term_months',
            'loan_term',
            'credit_term_months',
            'credit_term',
            'term_months',
            'term',
            'requested_term_months',
            'requested_term',
        ];

        foreach ($paths as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $value = (int) $data[$key];
            if ($value > 0) {
                return $value;
            }
        }

        if (isset($data['credit']) && is_array($data['credit'])) {
            foreach (['term_months', 'term', 'loan_term'] as $nestedKey) {
                if (!array_key_exists($nestedKey, $data['credit'])) {
                    continue;
                }

                $value = (int) $data['credit'][$nestedKey];
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }

    private function resolveLeadIbanForUser(int $userId, ?object $leadProfile = null): ?string
    {
        $leadIban = DB::table('ibans')
            ->where('user_id', $userId)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (!empty($leadIban)) {
            return (string) $leadIban;
        }

        $leadProfileIban = $leadProfile?->iban;
        if (empty($leadProfileIban)) {
            $leadProfileIban = DB::table('leads')
                ->where('user_id', $userId)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->value('iban');
        }

        return !empty($leadProfileIban) ? (string) $leadProfileIban : null;
    }

    private function resolveLoanTermMonthsForUser(int $userId, $wizardProgress, ?object $leadProfile = null): ?int
    {
        $termMonths = $this->extractLoanTermMonths($wizardProgress);
        if (($termMonths ?? 0) > 0) {
            return $termMonths;
        }

        $leadTerm = $leadProfile?->credit_term_months;
        if ((int) ($leadTerm ?? 0) <= 0) {
            $leadTerm = DB::table('leads')
                ->where('user_id', $userId)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->value('credit_term_months');
        }

        $leadTermInt = (int) ($leadTerm ?? 0);

        return $leadTermInt > 0 ? $leadTermInt : null;
    }

    private function resolveLeadProfileForUser(int $userId, ?string $email = null): ?object
    {
        $query = DB::table('leads')->where('user_id', $userId);

        $email = trim((string) ($email ?? ''));
        if ($email !== '') {
            $query->orWhereRaw('LOWER(email) = ?', [mb_strtolower($email)]);
        }

        return $query
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['first_name', 'last_name', 'email', 'requested_amount', 'document_number', 'credit_term_months', 'iban']);
    }

    private function resolveLeadName($user, ?object $leadProfile): string
    {
        $name = $this->formatLeadName($user->name ?? '', $user->surname ?? null);

        if ($name !== 'Без имени') {
            return $name;
        }

        $leadFirstName = (string) ($leadProfile?->first_name ?? '');
        $leadLastName = (string) ($leadProfile?->last_name ?? '');

        return $this->formatLeadName($leadFirstName, $leadLastName);
    }

    private function resolveLeadEmail($user, ?object $leadProfile): ?string
    {
        return $user->email ?: ($leadProfile?->email ?? null);
    }

    private function resolveLoanAmount($user, ?object $leadProfile)
    {
        $amount = $user->requested_amount;

        if (((float) ($amount ?? 0)) > 0) {
            return $amount;
        }

        return $leadProfile?->requested_amount ?? 0;
    }

    private function resolveDocumentNumber($user, ?object $leadProfile): ?string
    {
        if (!empty($user->document_number)) {
            return (string) $user->document_number;
        }

        if (!empty($leadProfile?->document_number)) {
            return (string) $leadProfile->document_number;
        }

        return null;
    }

    private function countUnreadClientMessages(int $chatId): int
    {
        return (int) DB::table('chat_messages')
            ->where('chat_id', $chatId)
            ->where('sender_type', '!=', 'manager')
            ->where(function ($q) {
                $q->whereNull('is_read');
                $q->orWhere('is_read', false);
            })
            ->count();
    }

    private function formatLeadName(?string $name, ?string $surname): string
    {
        $base = trim((string) $name);
        $tail = trim((string) $surname);

        if ($base === '' && $tail === '') {
            return 'Без имени';
        }

        if ($tail === '') {
            return $base;
        }

        $baseLower = mb_strtolower($base);
        $tailLower = mb_strtolower($tail);

        if (str_ends_with($baseLower, ' ' . $tailLower)) {
            return $base;
        }

        if ($baseLower === $tailLower) {
            return $base;
        }

        return trim($base . ' ' . $tail);
    }
}
