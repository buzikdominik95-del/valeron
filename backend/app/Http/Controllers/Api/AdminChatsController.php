<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use App\Models\AdminUser;
use App\Support\AdminManagerLevelStore;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class AdminChatsController extends Controller
{
    public function index(Request $request)
    {
        $actor = $this->resolveCurrentAdminUser($request);

        $query = Chat::with(['user', 'tags:id'])
            ->select([
                'chats.*',
                DB::raw('(SELECT message FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg'),
                DB::raw('(SELECT created_at FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg_time'),
                DB::raw('(SELECT iban FROM ibans WHERE user_id = chats.user_id ORDER BY is_default DESC, updated_at DESC, id DESC LIMIT 1) as lead_iban'),
                DB::raw('(SELECT COUNT(*) FROM documents WHERE user_id = chats.user_id) as documents_count'),
            ]);

        if ($actor && in_array($actor->role, ['manager', 'team_lead'], true)) {
            $query->where('chats.manager_id', $actor->id);
        }

        $chats = $query
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

    public function show(Request $request, $id)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        $chat = Chat::with(['user', 'tags:id'])->findOrFail($id);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

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
        $documentsState = $this->resolveDocumentsUploadState($chat->user, $leadProfile, $documentsCount, $resolvedDocumentNumber);

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
                    'documents_uploaded' => $documentsState['uploaded'],
                    'documents_count' => $documentsState['count'],
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

    public function messages(Request $request, $chatId)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        $chat = Chat::findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }
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

                $attachmentUrl = $this->normalizeAttachmentUrl($msg->attachment_url ?? null) ?? '';
                $attachmentKind = trim((string) ($msg->attachment_kind ?? ''));

                return [
                    'id' => $msg->id,
                    'message' => $msg->message,
                    'is_manager' => $isManager,
                    'sender_name' => $isManager ? 'Менеджер' : 'Клиент',
                    'created_at' => $msg->created_at,
                    'is_read' => (bool) ($msg->is_read ?? false),
                    'attachment' => ($attachmentUrl !== '' && in_array($attachmentKind, ['image', 'file'], true)) ? [
                        'kind' => $attachmentKind,
                        'name' => (string) ($msg->attachment_name ?? ''),
                        'url' => $attachmentUrl,
                        'mime' => (string) ($msg->attachment_mime ?? ''),
                    ] : null,
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
            'attachment_kind' => 'nullable|string|in:image,file',
            'attachment_name' => 'nullable|string|max:255',
            'attachment_url' => 'nullable|url|max:2048',
            'attachment_mime' => 'nullable|string|max:255',
        ]);

        $actor = $this->resolveCurrentAdminUser($request);
        $chat = Chat::findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        if (in_array((string) $chat->status, ['closed', 'completed'], true) && $actor && in_array($actor->role, ['manager', 'team_lead'], true)) {
            return response()->json(['success' => false, 'message' => 'Чат завершён для этого менеджера'], 409);
        }

        $senderId = $actor ? (int) $actor->id : 1;
        $senderName = $actor ? (string) $actor->name : 'Менеджер';

        $message = $chat->messages()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'manager',
            'sender_id' => $senderId,
            'message' => $request->message,
            'attachment_kind' => $request->input('attachment_kind'),
            'attachment_name' => $request->input('attachment_name'),
            'attachment_url' => $request->input('attachment_url'),
            'attachment_mime' => $request->input('attachment_mime'),
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

        $responseAttachmentUrl = $this->normalizeAttachmentUrl($message->attachment_url ?? null);
        $hasAttachment = !empty($responseAttachmentUrl) && in_array((string) $message->attachment_kind, ['image', 'file'], true);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $message->id,
                'message' => $message->message,
                'is_manager' => true,
                'sender_name' => $senderName,
                'created_at' => $message->created_at,
                'attachment' => $hasAttachment ? [
                    'kind' => (string) $message->attachment_kind,
                    'name' => (string) ($message->attachment_name ?? ''),
                    'url' => (string) $responseAttachmentUrl,
                    'mime' => (string) ($message->attachment_mime ?? ''),
                ] : null,
            ],
        ]);
    }

    public function updateMeta(Request $request, $chatId)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        $chat = Chat::with('user')->findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

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

    public function completeAndTransfer(Request $request, $chatId)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if (!in_array($actor->role, ['manager', 'team_lead', 'admin', 'super_admin'], true)) {
            return response()->json(['success' => false, 'message' => 'Недостаточно прав'], 403);
        }

        $chat = Chat::with('user')->findOrFail($chatId);
        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        if (!$chat->user) {
            return response()->json(['success' => false, 'message' => 'Клиент не найден'], 404);
        }

        $currentLevel = (int) ($chat->user->commission_level_id ?? 1);
        $nextLevel = $currentLevel + 1;

        if (in_array($actor->role, ['manager', 'team_lead'], true)) {
            $handled = AdminManagerLevelStore::getFor((int) $actor->id);
            if (!in_array($currentLevel, $handled, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Вы не отвечаете за этот уровень комиссии',
                    'current_level' => $currentLevel,
                    'handled_levels' => $handled,
                ], 403);
            }
        }

        $targetManager = $this->pickNextLevelManager($nextLevel, (int) $actor->id);

        DB::transaction(function () use ($chat, $currentLevel, $nextLevel, $targetManager, $actor) {
            $chat->user->commission_level_id = $nextLevel;

            if ($targetManager) {
                $chat->user->assigned_manager_id = (int) $targetManager->id;
            }

            $chat->user->save();

            if ($targetManager) {
                DB::table('leads')
                    ->where('user_id', $chat->user_id)
                    ->update([
                        'assigned_manager_id' => (int) $targetManager->id,
                        'updated_at' => now(),
                    ]);
            }

            $chat->status = 'completed';
            $chat->manager_id = (int) $actor->id;
            $chat->updated_at = now();
            $chat->save();

            $chat->messages()->create([
                'chat_id' => $chat->id,
                'sender_type' => 'system',
                'sender_id' => null,
                'message' => $targetManager
                    ? sprintf(
                        'Чат завершён менеджером %s на уровне %d и клиент передан менеджеру %s на уровень %d.',
                        (string) ($actor->name ?? 'manager'),
                        $currentLevel,
                        (string) ($targetManager->name ?? 'manager'),
                        $nextLevel
                    )
                    : sprintf(
                        'Чат завершён менеджером %s на уровне %d. Уровень клиента повышен до %d.',
                        (string) ($actor->name ?? 'manager'),
                        $currentLevel,
                        $nextLevel
                    ),
                'is_read' => true,
                'read_at' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Чат завершен',
            'data' => [
                'chat_id' => (int) $chat->id,
                'from_manager_id' => (int) $actor->id,
                'to_manager_id' => $targetManager ? (int) $targetManager->id : null,
                'to_manager_name' => $targetManager ? (string) $targetManager->name : null,
                'new_commission_level' => $nextLevel,
                'chat_status' => 'completed',
            ],
        ]);
    }

    private function mapChatData(Chat $chat): array
    {
        $user = $chat->user;
        $unreadCount = $this->countUnreadClientMessages((int) $chat->id);
        $documentsCount = (int) ($chat->documents_count ?? 0);
        $leadProfile = $this->resolveLeadProfileForUser((int) $chat->user_id, $chat->user->email ?? null);
        $resolvedDocumentNumber = $this->resolveDocumentNumber($user, $leadProfile);
        $documentsState = $this->resolveDocumentsUploadState($user, $leadProfile, $documentsCount, $resolvedDocumentNumber);

        return [
            'id' => $chat->id,
            'lead_name' => $this->resolveLeadName($user, $leadProfile),
            'lead_email' => $this->resolveLeadEmail($user, $leadProfile),
            'loan_amount' => $this->resolveLoanAmount($user, $leadProfile),
            'loan_term_months' => $this->resolveLoanTermMonthsForUser((int) $chat->user_id, $user->wizard_progress ?? null, $leadProfile),
            'lead_iban' => $chat->lead_iban ?: $this->resolveLeadIbanForUser((int) $chat->user_id, $leadProfile),
            'documents_uploaded' => $documentsState['uploaded'],
            'documents_count' => $documentsState['count'],
            'chat_created_at' => $chat->created_at,
            'document_type' => $user->document_type ?? null,
            'document_number' => $resolvedDocumentNumber,
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


    private function resolveDocumentsUploadState($user, ?object $leadProfile, int $documentsCount, ?string $resolvedDocumentNumber): array
    {
        if ($documentsCount > 0) {
            return [
                'uploaded' => true,
                'count' => $documentsCount,
            ];
        }

        $wizardProgress = $this->decodeProgress($user->wizard_progress ?? null);
        $fromProgress = $this->toBool($wizardProgress['documents_verified'] ?? null)
            || $this->toBool($wizardProgress['documents_uploaded'] ?? null);

        if ($fromProgress) {
            return [
                'uploaded' => true,
                'count' => 1,
            ];
        }

        $hasDocumentType = !empty(trim((string) ($user->document_type ?? '')));
        $hasDocumentNumber = !empty(trim((string) ($resolvedDocumentNumber ?? '')));

        if ($hasDocumentType && $hasDocumentNumber) {
            return [
                'uploaded' => true,
                'count' => 1,
            ];
        }

        return [
            'uploaded' => false,
            'count' => 0,
        ];
    }

    private function decodeProgress($rawData): array
    {
        if (is_array($rawData)) {
            return $rawData;
        }

        $decoded = json_decode((string) ($rawData ?? ''), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function normalizeAttachmentUrl(?string $url): ?string
    {
        $clean = trim((string) ($url ?? ''));
        if ($clean === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $clean) === 1) {
            $path = parse_url($clean, PHP_URL_PATH);
            if (is_string($path)) {
                $path = trim($path);
                if (str_starts_with($path, '/storage/')) {
                    return $path;
                }
            }
        }

        return $clean;
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            return in_array($normalized, ['1', 'true', 'yes', 'on', 'verified', 'uploaded'], true);
        }

        return false;
    }

    private function resolveCurrentAdminUser(Request $request): ?AdminUser
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return null;
        }

        $tokenable = $accessToken->tokenable;
        return $tokenable instanceof AdminUser ? $tokenable : null;
    }

    private function canAccessChat(?AdminUser $actor, Chat $chat): bool
    {
        if (!$actor) {
            return true;
        }

        if (in_array($actor->role, ['manager', 'team_lead'], true)) {
            return (int) $chat->manager_id === (int) $actor->id;
        }

        return true;
    }

    private function pickNextLevelManager(int $level, int $excludeManagerId = 0): ?AdminUser
    {
        $activeManagers = AdminUser::query()
            ->whereIn('role', ['manager', 'team_lead'])
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        $eligible = $activeManagers->filter(function (AdminUser $manager) use ($level, $excludeManagerId) {
            if ((int) $manager->id === $excludeManagerId) {
                return false;
            }

            $levels = AdminManagerLevelStore::getFor((int) $manager->id);
            return in_array($level, $levels, true);
        })->values();

        if ($eligible->isEmpty()) {
            return null;
        }

        $chatCounts = DB::table('chats')
            ->selectRaw('manager_id, COUNT(*) as c')
            ->whereIn('manager_id', $eligible->pluck('id')->all())
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '!=', 'closed');
            })
            ->groupBy('manager_id')
            ->pluck('c', 'manager_id');

        $best = null;
        $bestCount = null;

        foreach ($eligible as $manager) {
            $count = (int) ($chatCounts[(string) $manager->id] ?? 0);
            if ($best === null || $count < $bestCount) {
                $best = $manager;
                $bestCount = $count;
            }
        }

        return $best;
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
