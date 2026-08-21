<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use App\Models\AdminUser;
use App\Models\User;
use App\Support\AdminManagerLevelStore;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AdminChatsController extends Controller
{
    private ?array $commissionBonusByLevel = null;
    private ?array $autoDistributionByLevel = null;

    public function index(Request $request)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        // В локальной среде можно ограничить окно списка, чтобы не загружать
        // десятки тысяч чатов в браузер при ручном тестировании.
        $localListLimit = max(0, min(50000, (int) env('ADMIN_CHATS_LIST_LIMIT', 0)));

        // Кэш готового payload: версия сбрасывается при новых сообщениях (ChatPing)
        // и коротким TTL страхуемся от прочих мутаций. Ключ учитывает права актёра.
        $cacheVersion = (int) Cache::get('admin_chats_index_ver', 0);
        $scope = in_array($actor->role, ['manager', 'team_lead'], true) ? ('m' . $actor->id) : 'all';
        $cacheKey = 'admin_chats_index:' . $cacheVersion . ':' . $scope . ':l' . $localListLimit . ':' .
            (int) $request->integer('page', 1) . ':' . (int) $request->integer('per_page', 0);

        /*
         * ETag/304 привязан к моменту последней СБОРКИ payload (staleAt),
         * а не к версии кэша: версия бампается каждым сообщением, а сборка
         * происходит не чаще MIN_REBUILD_SECONDS. Между сборками клиенты
         * получают пустые 304 вместо повторной сериализации мегабайт JSON.
         */
        $staleAtKey = 'admin_chats_last_at:' . $scope . ':l' . $localListLimit . ':' .
            (int) $request->integer('page', 1) . ':' . (int) $request->integer('per_page', 0);
        $staleAt = (int) Cache::get($staleAtKey, 0);
        $staleVer = (int) Cache::get($staleAtKey . ':ver', -1);
        $etag = '"ac-' . $scope . '-' .
            (int) $request->integer('page', 1) . '-' . (int) $request->integer('per_page', 0) .
            '-' . $staleVer . '-' . $staleAt . '"';
        $minRebuildSeconds = 5;
        $buildIsFresh = $staleAt > 0 && (
            ($staleVer === $cacheVersion && (time() - $staleAt) < 15) ||
            ((time() - $staleAt) < $minRebuildSeconds)
        );
        if ($buildIsFresh && $request->headers->get('If-None-Match') === $etag) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
                ->header('Pragma', 'no-cache');
        }

        $cachedPayload = Cache::get($cacheKey);
        if (is_array($cachedPayload)) {
            return response()
                ->json($cachedPayload, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
                ->header('Pragma', 'no-cache');
        }

        /*
         * Анти-stampede: при промахе кэша параллельные одинаковые запросы
         * (WS-пинги у нескольких менеджеров) не должны строить тяжёлый payload
         * одновременно. Первый берёт lock и строит, остальные ждут и читают кэш.
         */
        /*
         * Stale-while-revalidate: если версия кэша сброшена (новое сообщение),
         * не заставляем менеджера ждать холодную сборку 4с+ — мгновенно отдаём
         * последний известный payload, а свежий построит тот, кто взял lock.
         */
        $staleKey = 'admin_chats_last:' . $scope . ':l' . $localListLimit . ':' .
            (int) $request->integer('page', 1) . ':' . (int) $request->integer('per_page', 0);

        /*
         * Мягкая свежесть: если версия не менялась — сборка не чаще раза в 15c.
         * Дополнительно (ключевое!): даже если версия сброшена новым сообщением,
         * пересборка не чаще раза в $minRebuildSeconds на scope — иначе при живой
         * переписке каждый 4с-поллинг каждого менеджера строит payload заново
         * (12k Eloquent-моделей + JSON), что и раскручивало CPU app/postgres.
         */
        if ($buildIsFresh) {
            $freshStale = Cache::get('admin_chats_last:' . $scope . ':l' . $localListLimit . ':' .
                (int) $request->integer('page', 1) . ':' . (int) $request->integer('per_page', 0));
            if (is_array($freshStale)) {
                return response()
                    ->json($freshStale, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                    ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
                    ->header('Pragma', 'no-cache');
            }
        }

        $lock = Cache::lock('lock:' . $cacheKey, 15);
        $gotLock = $lock->get();
        if (!$gotLock) {
            $stale = Cache::get($staleKey);
            if (is_array($stale)) {
                return response()
                    ->json($stale, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                    ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
                    ->header('Pragma', 'no-cache');
            }
            try {
                $lock->block(12);
                $gotLock = true;
            } catch (\Throwable $e) {
                $gotLock = false;
            }
            $cachedPayload = Cache::get($cacheKey);
            if (is_array($cachedPayload)) {
                if ($gotLock) $lock->release();
                return response()
                    ->json($cachedPayload, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                    ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
                    ->header('Pragma', 'no-cache');
            }
        }

        try {

        $query = Chat::with([
                'user:id,name,surname,email,requested_amount,document_type,document_number,commission_level_id',
                'tags:id,name,color',
            ])
            ->select([
                'chats.*',
                DB::raw('(SELECT message FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg'),
                DB::raw('(SELECT created_at FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg_time'),
                DB::raw('(SELECT iban FROM ibans WHERE user_id = chats.user_id ORDER BY is_default DESC, updated_at DESC, id DESC LIMIT 1) as lead_iban'),
                DB::raw('(SELECT COUNT(*) FROM documents WHERE user_id = chats.user_id) as documents_count'),
                DB::raw("(SELECT COUNT(*) FROM chat_messages WHERE chat_id = chats.id AND sender_type != 'manager' AND (is_read IS NULL OR is_read = false)) as unread_count"),
                DB::raw("(SELECT created_at FROM chat_messages WHERE chat_id = chats.id AND sender_type != 'manager' AND (is_read IS NULL OR is_read = false) ORDER BY created_at ASC LIMIT 1) as first_unread_msg_time"),
                DB::raw('(SELECT name FROM admin_users WHERE id = chats.manager_id LIMIT 1) as manager_name'),
                // Срок кредита извлекаем прямо в SQL: сам wizard_progress хранит
                // base64-подписи (до 166KB на юзера) и загружать его в PHP нельзя.
                DB::raw("(SELECT COALESCE(NULLIF(u.wizard_progress->>'loan_term_months',''), NULLIF(u.wizard_progress->>'loan_term',''), NULLIF(u.wizard_progress->>'credit_term_months',''), NULLIF(u.wizard_progress->>'credit_term',''), NULLIF(u.wizard_progress->>'term_months',''), NULLIF(u.wizard_progress->>'term',''), NULLIF(u.wizard_progress#>>'{credit,term_months}',''), NULLIF(u.wizard_progress#>>'{credit,term}','')) FROM users u WHERE u.id = chats.user_id) as wp_term"),
            ]);

        if ($actor && in_array($actor->role, ['manager', 'team_lead'], true)) {
            $query->where('chats.manager_id', $actor->id);
        }

        $orderedQuery = $query
            // Вверх — чаты со старейшим первым непрочитанным входящим; NULL (нет непрочитанных) уходит вниз.
            ->orderByRaw("(SELECT created_at FROM chat_messages WHERE chat_id = chats.id AND sender_type != 'manager' AND (is_read IS NULL OR is_read = false) ORDER BY created_at ASC LIMIT 1) ASC NULLS LAST")
            // Фолбэк для одинакового времени/чатов без непрочитанных — по активности.
            ->orderBy('updated_at', 'desc');

        if ($localListLimit > 0) {
            // Это режим локального тестирования. Он не выполняет COUNT(*) и не
            // даёт собранному фронту запускать фоновую загрузку всех страниц.
            // Порядок запроса оставляет в окне непрочитанные и последние активные чаты.
            $paginator = null;
            $chatsRaw = $orderedQuery->limit($localListLimit)->get();
        } else {
            // В штатном режиме сохраняем прежнее постраничное поведение.
            $requestedPerPage = (int) $request->integer('per_page', 0);
            $perPageSource = $requestedPerPage > 0
                ? $requestedPerPage
                : (clone $orderedQuery)->toBase()->getCountForPagination();
            $perPage = max(10, min(50000, (int) $perPageSource));
            $page = max(1, (int) $request->integer('page', 1));
            $paginator = $orderedQuery->paginate($perPage, ['*'], 'page', $page);
            $chatsRaw = collect($paginator->items());
        }

        $leadProfilesByUser = $this->loadLeadProfilesByUsers($chatsRaw);
        $lastSeenByUser = $this->loadLastSeenByUsers($chatsRaw);

        $chats = $chatsRaw
            ->map(fn (Chat $chat) => $this->mapChatData(
                $chat,
                $leadProfilesByUser[(int) $chat->user_id] ?? null,
                $lastSeenByUser[(int) $chat->user_id] ?? null,
                false
            ));

        $payload = [
            'success' => true,
            // ВАЖНО: только plain array! Collection в Redis-кэше
            // десериализуется как __PHP_Incomplete_Class и ломает JSON.
            'data' => $chats->values()->all(),
        ];

        if ($paginator) {
            $payload['meta'] = [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ];
        } elseif ($localListLimit > 0) {
            $payload['meta'] = [
                'current_page' => 1,
                'per_page' => $localListLimit,
                'last_page' => 1,
                'total' => $chats->count(),
            ];
        }

        Cache::put($cacheKey, $payload, now()->addSeconds(8));
        Cache::put($staleKey, $payload, now()->addMinutes(10));
        Cache::put($staleAtKey, time(), now()->addMinutes(10));
        Cache::put($staleAtKey . ':ver', $cacheVersion, now()->addMinutes(10));
        } finally {
            if ($gotLock) {
                try { $lock->release(); } catch (\Throwable $e) {}
            }
        }

        return response()
            ->json($payload, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            ->header('ETag', $etag)
                ->header('Cache-Control', 'private, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache');
    }

    public function show(Request $request, $id)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $chat = Chat::with(['user', 'tags:id,name,color'])->findOrFail($id);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        $leadProfile = $this->resolveLeadProfileForUser((int) $chat->user_id, $chat->user?->email ?? null);

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
        $lastSeenAt = DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\Models\User')
            ->where('tokenable_id', (int) $chat->user_id)
            ->max('last_used_at');

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
                    'client_presence' => $this->resolvePresenceFromLastSeen($lastSeenAt),
                    'client_last_seen_at' => $lastSeenAt,
                    'client_ip' => $this->resolveClientIpForUser((int) $chat->user_id),
                    'notes' => (string) ($chat->notes ?? ''),
                ],
                'tags' => $chat->tags->pluck('id')->values()->all(),
                'tag_items' => $chat->tags->map(function ($tag) {
                    return [
                        'id' => (int) $tag->id,
                        'name' => (string) ($tag->name ?? ('Tag ' . $tag->id)),
                        'color' => (string) ($tag->color ?? '#6b7280'),
                    ];
                })->values()->all(),
            ],
        ]);
    }

    public function messages(Request $request, $chatId)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $chat = Chat::findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }
        $rawMessages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get();

        $managerSenderIds = $rawMessages
            ->filter(function ($msg) {
                return (($msg->sender_type ?? null) === 'manager') || (bool) ($msg->is_manager ?? false);
            })
            ->pluck('sender_id')
            ->filter(fn ($id) => !is_null($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $managerNamesById = $managerSenderIds->isNotEmpty()
            ? AdminUser::query()->whereIn('id', $managerSenderIds->all())->pluck('name', 'id')
            : collect();

        $messages = $rawMessages->map(function ($msg) use ($managerNamesById) {
            $isManager = false;
            if (($msg->sender_type ?? null) === 'manager') {
                $isManager = true;
            }
            if ((bool) ($msg->is_manager ?? false)) {
                $isManager = true;
            }

            $attachmentUrl = $this->normalizeAttachmentUrl($msg->attachment_url ?? null) ?? '';
            $attachmentKind = trim((string) ($msg->attachment_kind ?? ''));

            $senderName = 'Клиент';
            if ($isManager) {
                $resolvedManagerName = trim((string) ($managerNamesById->get((int) ($msg->sender_id ?? 0)) ?? ''));
                $senderName = $resolvedManagerName !== '' ? $resolvedManagerName : 'Менеджер';
            }

            return [
                'id' => $msg->id,
                'message' => $msg->message,
                'is_manager' => $isManager,
                'sender_name' => $senderName,
                'created_at' => $msg->created_at,
                'is_read' => (bool) ($msg->is_read ?? false),
                'deleted_for_user' => (bool) ($msg->deleted_for_user ?? false),
                'deleted_for_user_at' => $msg->deleted_for_user_at,
                'attachment' => ($attachmentUrl !== '' && in_array($attachmentKind, ['image', 'file'], true)) ? [
                    'kind' => $attachmentKind,
                    'name' => (string) ($msg->attachment_name ?? ''),
                    'url' => $attachmentUrl,
                    'mime' => (string) ($msg->attachment_mime ?? ''),
                ] : null,
                'attachment_lost' => ($attachmentUrl === '' && trim((string) ($msg->attachment_url ?? '')) !== ''),
                'attachment_lost_name' => (string) ($msg->attachment_name ?? ''),
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

    public function deleteMessage(Request $request, $chatId, $messageId)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $chat = Chat::findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        if ($this->isObserver($actor)) {
            return response()->json(['success' => false, 'message' => 'Observer имеет только доступ на чтение'], 403);
        }

        $message = $chat->messages()->where('id', (int) $messageId)->first();
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Сообщение не найдено'], 404);
        }

        if (!(bool) ($message->deleted_for_user ?? false)) {
            $message->deleted_for_user = true;
            $message->deleted_for_user_at = now();
            $message->deleted_by_admin_id = (int) ($actor->id ?? 0) ?: null;
            $message->save();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $message->id,
                'deleted_for_user' => (bool) ($message->deleted_for_user ?? false),
                'deleted_for_user_at' => $message->deleted_for_user_at,
            ],
        ]);
    }

    public function sendMessage(Request $request, $chatId)
    {
        $request->validate([
            'message' => 'nullable|string|max:5000',
            'attachment_kind' => 'nullable|string|in:image,file',
            'attachment_name' => 'nullable|string|max:255',
            'attachment_url' => 'nullable|url|max:2048',
            'attachment_mime' => 'nullable|string|max:255',
            'attachment_file' => 'nullable|file|max:20480',
        ]);

        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $chat = Chat::findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        if ($this->isObserver($actor)) {
            return response()->json(['success' => false, 'message' => 'Observer имеет только доступ на чтение'], 403);
        }

        if (in_array((string) $chat->status, ['closed', 'completed'], true) && $actor && in_array($actor->role, ['manager', 'team_lead'], true)) {
            return response()->json(['success' => false, 'message' => 'Чат завершён для этого менеджера'], 409);
        }

        $messageText = trim((string) $request->input('message', ''));
        $attachmentKind = trim((string) $request->input('attachment_kind', ''));
        $attachmentName = trim((string) $request->input('attachment_name', ''));
        $attachmentUrl = trim((string) $request->input('attachment_url', ''));
        $attachmentMime = trim((string) $request->input('attachment_mime', ''));

        if ($request->hasFile('attachment_file')) {
            $uploaded = $request->file('attachment_file');
            if ($uploaded and $uploaded->isValid()) {
                $heicLike = $this->isHeicLikeImageUpload($uploaded);
                $conversion = $heicLike ? $this->convertHeicToJpegTemp($uploaded) : null;
                $conversionSucceeded = false;

                $storedPath = null;
                $effectiveMime = trim((string) ($uploaded->getClientMimeType() ?? $attachmentMime));
                $effectiveName = trim((string) $uploaded->getClientOriginalName());

                if (is_array($conversion)) {
                    $tmpPath = trim((string) ($conversion['tmp_path'] ?? ''));
                    $ext = trim((string) ($conversion['extension'] ?? 'jpg'));
                    $mime = trim((string) ($conversion['mime'] ?? 'image/jpeg'));

                    if ($tmpPath !== '' and is_file($tmpPath)) {
                        $safeBase = Str::slug(pathinfo($effectiveName, PATHINFO_FILENAME)) ?: 'attachment';
                        $safeFile = sprintf('%s-%s.%s', $safeBase, Str::random(8), $ext);
                        $storedPathCandidate = 'chat_attachments/'.(int) $chat->user_id.'/'.$safeFile;
                        $raw = @file_get_contents($tmpPath);

                        if (is_string($raw) and $raw !== '' and Storage::disk('public')->put($storedPathCandidate, $raw)) {
                            $storedPath = $storedPathCandidate;
                            $effectiveMime = $mime;

                            $baseName = trim((string) pathinfo($effectiveName, PATHINFO_FILENAME));
                            if ($baseName === '') {
                                $baseName = 'attachment';
                            }
                            $effectiveName = $baseName.'.'.$ext;
                            $conversionSucceeded = true;
                        }

                        @unlink($tmpPath);
                    }
                }

                if (!is_string($storedPath) or $storedPath === '') {
                    $safeBase = Str::slug(pathinfo($uploaded->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'attachment';
                    $ext = strtolower((string) $uploaded->getClientOriginalExtension());
                    if ($ext === '') {
                        $ext = 'bin';
                    }
                    $safeFile = sprintf('%s-%s.%s', $safeBase, Str::random(8), $ext);
                    $storedPath = $uploaded->storeAs('chat_attachments/'.(int) $chat->user_id, $safeFile, 'public');
                }

                if (is_string($storedPath) and $storedPath !== '') {
                    $attachmentUrl = '/storage/'.ltrim($storedPath, '/');
                    $attachmentMime = $effectiveMime;
                    $attachmentName = $effectiveName;
                    if ($attachmentName === '') {
                        $attachmentName = 'attachment';
                    }

                    if ($heicLike and !$conversionSucceeded) {
                        $attachmentKind = 'file';
                    } elseif ($attachmentKind === '') {
                        $attachmentKind = str_starts_with(strtolower($attachmentMime), 'image/')
                            ? 'image'
                            : 'file';
                    }
                }
            }
        }


        if (!in_array($attachmentKind, ['image', 'file'], true)) {
            $attachmentKind = null;
        }

        if ($attachmentUrl === '') {
            $attachmentUrl = null;
            $attachmentName = null;
            $attachmentMime = null;
            $attachmentKind = null;
        }

        if ($messageText === '' && !$attachmentUrl) {
            return response()->json(['success' => false, 'message' => 'Введите сообщение или прикрепите файл'], 422);
        }

        $senderId = $actor ? (int) $actor->id : 1;
        $senderName = $actor ? (string) $actor->name : 'Менеджер';

        $message = $chat->messages()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'manager',
            'sender_id' => $senderId,
            'message' => $messageText,
            'attachment_kind' => $attachmentKind,
            'attachment_name' => $attachmentName,
            'attachment_url' => $attachmentUrl,
            'attachment_mime' => $attachmentMime,
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

        \App\Events\ChatPing::safeDispatch((int) $chat->id);

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
                'deleted_for_user' => false,
                'deleted_for_user_at' => null,
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
        if (!$actor) {
            $actor = $this->resolveReadOnlyFallbackAdmin($request);
        }

        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $chat = Chat::with('user')->findOrFail($chatId);

        if (!$this->canAccessChat($actor, $chat)) {
            return response()->json(['success' => false, 'message' => 'Доступ к чату запрещён'], 403);
        }

        if ($this->isObserver($actor)) {
            return response()->json(['success' => false, 'message' => 'Observer имеет только доступ на чтение'], 403);
        }

        $validated = $request->validate([
            'tags' => 'sometimes|array',
            'tags.*' => 'integer|exists:tags,id',
            'commission_level' => 'sometimes|integer|min:1|exists:commission_levels,order',
            'expected_commission_level' => 'sometimes|integer|min:1',
            'notes' => 'sometimes|nullable|string|max:5000',
        ]);

        // Старые собранные версии админки отправляли весь объект карточки даже
        // при автосохранении заметок и тегов. Если в таком запросе нет версии
        // этапа, изменение этапа намеренным считать нельзя: иначе старая
        // вкладка способна откатить лида на прежний уровень.
        if (array_key_exists('commission_level', $validated)
            && (array_key_exists('tags', $validated) || array_key_exists('notes', $validated))
            && !array_key_exists('expected_commission_level', $validated)) {
            unset($validated['commission_level']);
        }

        if (array_key_exists('tags', $validated)) {
            $chat->tags()->sync($validated['tags'] ?? []);
        }

        if (array_key_exists('commission_level', $validated)) {
            $transitionLock = Cache::lock('lead_transition:' . (int) $chat->user_id, 20);
            if (!$transitionLock->get()) {
                return response()->json(['success' => false, 'message' => 'Лид сейчас переводится на другой этап. Повторите действие через несколько секунд.'], 409);
            }

            try {
            if ($chat->user) {
                $nextLevel = max(1, (int) $validated['commission_level']);
                $prevLevel = (int) ($chat->user->commission_level_id ?? 1);

                if (array_key_exists('expected_commission_level', $validated)
                    && (int) $validated['expected_commission_level'] !== $prevLevel) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Этап уже был изменён в другой вкладке. Обновите карточку и повторите действие.',
                        'data' => ['commission_level' => $prevLevel],
                    ], 409);
                }

                $this->resetFunnelProgressForLevelChange($chat->user, $prevLevel, $nextLevel);
                $chat->user->commission_level_id = $nextLevel;
                $chat->user->save();

                $assignedManagerId = ManagerTrafficAssigner::syncChatAssignment($chat->user->fresh(), $chat);

                DB::table('leads')
                    ->where('user_id', (int) $chat->user_id)
                    ->update([
                        'commission_level_id' => $nextLevel,
                        'assigned_manager_id' => $assignedManagerId,
                        'updated_at' => now(),
                    ]);

                // Сбрасываем кэш списков и оповещаем всех открытых клиентов (иначе
                // менеджеры видят старый уровень до следующего сообщения в чате).
                \App\Events\ChatPing::safeDispatch((int) $chat->id);
            }
            } finally {
                try { $transitionLock->release(); } catch (\Throwable $e) {}
            }
        }

        if (array_key_exists('notes', $validated)) {
            $chat->notes = (string) ($validated['notes'] ?? '');
            $chat->save();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tags' => $chat->tags()->pluck('tags.id')->values()->all(),
                'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
                'notes' => (string) ($chat->notes ?? ''),
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

        $transitionLock = Cache::lock('lead_transition:' . (int) $chat->user_id, 20);
        if (!$transitionLock->get()) {
            return response()->json(['success' => false, 'message' => 'Лид сейчас переводится на другой этап. Повторите действие через несколько секунд.'], 409);
        }

        try {
        $currentLevel = (int) ($chat->user->commission_level_id ?? 1);
        $nextConfiguredLevel = DB::table('commission_levels')
            ->where('order', '>', $currentLevel)
            ->min('order');
        $isFinalLevel = $nextConfiguredLevel === null;
        $nextLevel = $isFinalLevel ? $currentLevel : (int) $nextConfiguredLevel;

        if (in_array($actor->role, ['manager', 'team_lead'], true) && (bool) ($actor->uses_level_system ?? true)) {
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

        $autoDistributionEnabled = !$isFinalLevel && $this->isAutoDistributionEnabledForLevel($nextLevel);
        // Текущий менеджер не исключается: если он обрабатывает и следующий
        // уровень, он участвует в ротации наравне с остальными.
        $targetManager = $autoDistributionEnabled
            ? $this->pickNextLevelManager($nextLevel)
            : null;

        DB::transaction(function () use ($chat, $currentLevel, $nextLevel, $targetManager, $actor, $isFinalLevel) {
            if (!$isFinalLevel) {
                $this->resetFunnelProgressForLevelChange($chat->user, $currentLevel, $nextLevel);
                $chat->user->commission_level_id = $nextLevel;
            }

            if ($targetManager) {
                $chat->user->assigned_manager_id = (int) $targetManager->id;
            }

            $chat->user->save();

            $leadUpdatePayload = ['updated_at' => now()];
            if (!$isFinalLevel) {
                $leadUpdatePayload['commission_level_id'] = $nextLevel;
            }

            if ($targetManager) {
                $leadUpdatePayload['assigned_manager_id'] = (int) $targetManager->id;
            }

            DB::table('leads')
                ->where('user_id', $chat->user_id)
                ->update($leadUpdatePayload);

            /*
             * FIX «чаты пропадают»: раньше chat.manager_id оставался у старого
             * менеджера, а статус становился completed — новый менеджер чат не
             * видел (index фильтрует по manager_id), старый писать не мог.
             * Теперь при передаче чат переходит к целевому менеджеру и снова
             * активен; без целевого — остаётся completed у текущего.
             */
            if ($targetManager) {
                $chat->manager_id = (int) $targetManager->id;
                $chat->status = 'active';
            } else {
                $chat->manager_id = (int) $actor->id;
                $chat->status = 'completed';
            }
            $chat->updated_at = now();
            $chat->save();

        });

        /*
         * Инвалидация кэша списка чатов + realtime-пинг: без этого у старого
         * менеджера чат «висел» до истечения stale-кэша, а у нового не появлялся
         * без перезагрузки страницы.
         */
        \App\Events\ChatPing::safeDispatch((int) $chat->id);

        return response()->json([
            'success' => true,
            'message' => 'Чат завершен',
            'data' => [
                'chat_id' => (int) $chat->id,
                'from_manager_id' => (int) $actor->id,
                'from_manager_name' => (string) ($actor->name ?? 'manager'),
                'to_manager_id' => $targetManager ? (int) $targetManager->id : null,
                'to_manager_name' => $targetManager ? (string) $targetManager->name : null,
                'previous_commission_level' => $currentLevel,
                'new_commission_level' => $nextLevel,
                'chat_status' => $targetManager ? 'active' : 'completed',
            ],
        ]);
        } finally {
            try { $transitionLock->release(); } catch (\Throwable $e) {}
        }
    }

    private function mapChatData(Chat $chat, ?object $leadProfile = null, $lastSeenAt = null, bool $allowDbFallback = true): array
    {
        $user = $chat->user;
        $unreadCount = (int) ($chat->unread_count ?? 0);
        $documentsCount = (int) ($chat->documents_count ?? 0);
        $resolvedDocumentNumber = $this->resolveDocumentNumber($user, $leadProfile);
        $documentsState = $this->resolveDocumentsUploadState($user, $leadProfile, $documentsCount, $resolvedDocumentNumber);

        return [
            'id' => $chat->id,
            'lead_name' => $this->resolveLeadName($user, $leadProfile),
            'lead_email' => $this->resolveLeadEmail($user, $leadProfile),
            'loan_amount' => $this->resolveLoanAmount($user, $leadProfile),
            'loan_term_months' => ((int) ($chat->wp_term ?? 0)) > 0
                ? (int) $chat->wp_term
                : $this->resolveLoanTermMonthsForUser((int) $chat->user_id, $user?->wizard_progress ?? null, $leadProfile, $allowDbFallback),
            'lead_iban' => $chat->lead_iban ?: ($allowDbFallback ? $this->resolveLeadIbanForUser((int) $chat->user_id, $leadProfile) : ($leadProfile?->iban ?: null)),
            'documents_uploaded' => $documentsState['uploaded'],
            'documents_count' => $documentsState['count'],
            'chat_created_at' => $chat->created_at,
            'document_type' => $user?->document_type ?? null,
            'document_number' => $resolvedDocumentNumber,
            // Превью: полный текст не нужен в списке (экономит мегабайты на 12k+ чатах).
            'last_msg' => $chat->last_msg !== null ? mb_substr((string) $chat->last_msg, 0, 200) : null,
            'status' => $chat->status,
            // Заметки грузятся отдельно при открытии чата (show/meta); в списке — пусто.
            'notes' => '',
            'unread_count' => $unreadCount,
            'has_unread_messages' => $unreadCount > 0,
            'stage_name' => null,
            'tags' => $chat->tags->pluck('id')->values()->all(),
            'tag_items' => $chat->tags->map(function ($tag) {
                return [
                    'id' => (int) $tag->id,
                    'name' => (string) ($tag->name ?? ('Tag ' . $tag->id)),
                    'color' => (string) ($tag->color ?? '#6b7280'),
                ];
            })->values()->all(),
            'commission_level' => (int) ($user?->commission_level_id ?? 1),
            'manager_name' => $chat->manager_name ?: null,
            'first_unread_msg_time' => $chat->first_unread_msg_time ?? null,
            'updated_at' => $chat->first_unread_msg_time ?? $chat->last_msg_time ?? $chat->updated_at,
            'client_presence' => $this->resolvePresenceFromLastSeen($lastSeenAt),
            'client_last_seen_at' => $lastSeenAt,
        ];
    }

    private function loadLastSeenByUsers($chats): array
    {
        $userIds = [];

        foreach ($chats as $chat) {
            $userId = (int) ($chat->user_id ?? 0);
            if ($userId > 0) {
                $userIds[$userId] = $userId;
            }
        }

        if (empty($userIds)) {
            return [];
        }

        return DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\Models\User')
            ->whereIn('tokenable_id', array_values($userIds))
            ->groupBy('tokenable_id')
            ->select('tokenable_id', DB::raw('MAX(last_used_at) as last_used_at'))
            ->pluck('last_used_at', 'tokenable_id')
            ->all();
    }

    private function resolvePresenceFromLastSeen($lastSeenAt): string
    {
        if (empty($lastSeenAt)) {
            return 'offline';
        }

        try {
            $lastSeenTs = strtotime((string) $lastSeenAt);
            if ($lastSeenTs === false) {
                return 'offline';
            }

            return $lastSeenTs >= now('UTC')->subMinutes(3)->getTimestamp()
                ? 'online'
                : 'offline';
        } catch (\Throwable $e) {
            return 'offline';
        }
    }

    private function resolveClientIpForUser(int $userId): ?string
    {
        if ($userId <= 0) {
            return null;
        }

        $ip = DB::table('sessions')
            ->where('user_id', $userId)
            ->whereNotNull('ip_address')
            ->where('ip_address', '!=', '')
            ->orderByDesc('last_activity')
            ->value('ip_address');

        $ip = trim((string) ($ip ?? ''));

        return $ip !== '' ? $ip : null;
    }

    private function loadLeadProfilesByUsers($chats): array
    {
        $userIds = [];
        $emailsByUserId = [];

        foreach ($chats as $chat) {
            $userId = (int) ($chat->user_id ?? 0);
            if ($userId > 0) {
                $userIds[$userId] = $userId;
            }

            $email = trim((string) ($chat->user->email ?? ''));
            if ($email !== '' && $userId > 0) {
                $emailsByUserId[$userId] = mb_strtolower($email);
            }
        }

        $profilesByUserId = [];

        if (!empty($userIds)) {
            $rows = DB::table('leads')
                ->whereIn('user_id', array_values($userIds))
                ->orderBy('user_id')
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get(['user_id', 'first_name', 'last_name', 'email', 'requested_amount', 'document_number', 'credit_term_months', 'iban']);

            foreach ($rows as $row) {
                $uid = (int) ($row->user_id ?? 0);
                if ($uid <= 0 || isset($profilesByUserId[$uid])) {
                    continue;
                }

                $profilesByUserId[$uid] = $row;
            }
        }

        $missingUserIds = array_values(array_diff(array_values($userIds), array_keys($profilesByUserId)));
        if (!empty($missingUserIds)) {
            $missingEmails = [];
            foreach ($missingUserIds as $uid) {
                $email = $emailsByUserId[$uid] ?? null;
                if (!empty($email)) {
                    $missingEmails[$email] = $email;
                }
            }

            if (!empty($missingEmails)) {
                $emailRows = DB::table('leads')
                    ->whereIn(DB::raw('LOWER(email)'), array_values($missingEmails))
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->get(['user_id', 'first_name', 'last_name', 'email', 'requested_amount', 'document_number', 'credit_term_months', 'iban']);

                $profilesByEmail = [];
                foreach ($emailRows as $row) {
                    $leadEmail = mb_strtolower(trim((string) ($row->email ?? '')));
                    if ($leadEmail === '' || isset($profilesByEmail[$leadEmail])) {
                        continue;
                    }

                    $profilesByEmail[$leadEmail] = $row;
                }

                foreach ($missingUserIds as $uid) {
                    $email = $emailsByUserId[$uid] ?? null;
                    if (empty($email) || !isset($profilesByEmail[$email])) {
                        continue;
                    }

                    $profilesByUserId[$uid] = $profilesByEmail[$email];
                }
            }
        }

        return $profilesByUserId;
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

    private function resolveLoanTermMonthsForUser(int $userId, $wizardProgress, ?object $leadProfile = null, bool $allowDbFallback = true): ?int
    {
        $termMonths = $this->extractLoanTermMonths($wizardProgress);
        if (($termMonths ?? 0) > 0) {
            return $termMonths;
        }

        $leadTerm = $leadProfile?->credit_term_months;
        if ((int) ($leadTerm ?? 0) <= 0 && $allowDbFallback) {
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
        $name = $this->formatLeadName($user?->name ?? '', $user?->surname ?? null);

        if ($name !== 'Без имени') {
            return $name;
        }

        $leadFirstName = (string) ($leadProfile?->first_name ?? '');
        $leadLastName = (string) ($leadProfile?->last_name ?? '');

        return $this->formatLeadName($leadFirstName, $leadLastName);
    }

    private function resolveLeadEmail($user, ?object $leadProfile): ?string
    {
        $email = trim((string) ($user?->email ?? ''));

        return $email !== '' ? $email : ($leadProfile?->email ?? null);
    }

    private function resolveLoanAmount($user, ?object $leadProfile)
    {
        $requestedAmount = (float) ($user?->requested_amount ?? 0);

        if ($requestedAmount <= 0) {
            $requestedAmount = (float) ($leadProfile?->requested_amount ?? 0);
        }

        $baseApproved = $this->approvedFromRequested($requestedAmount);

        $level = max(1, (int) ($user?->commission_level_id ?? 1));
        $bonus = $this->resolveCommissionBonusForLevel($level);

        return max(0, round($baseApproved + max(0, $bonus), 2));
    }

    private function resolveCommissionBonusForLevel(int $level): float
    {
        if ($this->commissionBonusByLevel === null) {
            $this->commissionBonusByLevel = \App\Models\CommissionLevel::query()
                ->pluck('approved_amount_bonus', 'order')
                ->map(fn ($value) => (float) ($value ?? 0))
                ->all();
        }

        return (float) ($this->commissionBonusByLevel[$level] ?? 0);
    }

    private function approvedFromRequested(float $requested): float
    {
        if ($requested <= 0) {
            return 0.0;
        }

        $cutMin = 0.15;
        $cutMax = 0.20;
        $steps = (int) round($cutMax * 100 - $cutMin * 100) + 1;
        $cut = $cutMin + (abs((int) round($requested / 500)) % $steps) / 100;

        $reduced = $requested * (1 - $cut);

        return floor($reduced / 100) * 100;
    }

    private function resolveDocumentNumber($user, ?object $leadProfile): ?string
    {
        if (!empty($user?->document_number)) {
            return (string) $user?->document_number;
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

        $wizardProgress = $this->decodeProgress($user?->wizard_progress ?? null);
        $fromProgress = $this->toBool($wizardProgress['documents_verified'] ?? null)
            || $this->toBool($wizardProgress['documents_uploaded'] ?? null);

        if ($fromProgress) {
            return [
                'uploaded' => true,
                'count' => 1,
            ];
        }

        $hasDocumentType = !empty(trim((string) ($user?->document_type ?? '')));
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


    /**
     * Смена уровня админом = новый этап воронки: стираем метки прошлого этапа
     * (иначе level>=4 с withdraw_fail_notified_at мгновенно даёт tg_final,
     * минуя выбор суммы и анимацию перевода).
     */
    private function resetFunnelProgressForLevelChange($user, int $prevLevel, int $nextLevel): void
    {
        if ($prevLevel === $nextLevel) {
            return;
        }
        $raw = $user->wizard_progress;
        $progress = is_array($raw) ? $raw : (is_string($raw) ? (json_decode($raw, true) ?: []) : []);
        $dirty = false;
        foreach (['withdraw_fail_notified_at', 'withdraw_anim_started_at', 'policy_build_started_at'] as $key) {
            if (array_key_exists($key, $progress)) {
                unset($progress[$key]);
                $dirty = true;
            }
        }
        if ($dirty) {
            $user->wizard_progress = json_encode($progress, JSON_UNESCAPED_UNICODE);
        }
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
                $clean = trim($path);
            }
        }

        if (str_starts_with($clean, '/storage/')) {
            $relativePath = ltrim(substr($clean, 9), '/');
            if ($relativePath === '') {
                return null;
            }

            if (!Storage::disk('public')->exists($relativePath)) {
                return null;
            }

            return '/storage/'.$relativePath;
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
        $authUser = $request->user('sanctum') ?? $request->user();
        if ($authUser instanceof AdminUser) {
            return $authUser;
        }

        $token = trim((string) ($request->bearerToken() ?? ''));

        if ($token === '') {
            $token = trim((string) $request->header('X-Admin-Token', ''));
        }

        if ($token === '' || in_array(strtolower($token), ['null', 'undefined'], true)) {
            return null;
        }

        if (str_starts_with(strtolower($token), 'bearer ')) {
            $token = trim(substr($token, 7));
        }

        if ($token === '' || in_array(strtolower($token), ['null', 'undefined'], true)) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return null;
        }

        $tokenable = $accessToken->tokenable;
        return $tokenable instanceof AdminUser ? $tokenable : null;
    }

    private function resolveReadOnlyFallbackAdmin(Request $request): ?AdminUser
    {
        $host = strtolower((string) $request->getHost());
        $allowedHosts = ['monitoring.velorafinanza.com', 'admin.it-velora.com'];

        if (!in_array($host, $allowedHosts, true)) {
            return null;
        }

        return AdminUser::query()
            ->where('is_active', true)
            ->whereIn('role', ['super_admin', 'admin'])
            ->orderByDesc('id')
            ->first();
    }

    private function canAccessChat(?AdminUser $actor, Chat $chat): bool
    {
        if (!$actor) {
            return false;
        }

        if (in_array($actor->role, ['manager', 'team_lead'], true)) {
            return (int) $chat->manager_id === (int) $actor->id;
        }

        return true;
    }

    private function isObserver(?AdminUser $actor): bool
    {
        return $actor && (string) ($actor->role ?? '') === 'observer';
    }

    private function isAutoDistributionEnabledForLevel(int $level): bool
    {
        $level = max(1, $level);
        $key = (string) $level;

        $map = $this->getAutoDistributionByLevelMap();

        if (!array_key_exists($key, $map)) {
            return true;
        }

        return $this->toBool($map[$key]);
    }

    private function getAutoDistributionByLevelMap(): array
    {
        if ($this->autoDistributionByLevel !== null) {
            return $this->autoDistributionByLevel;
        }

        $raw = DB::table('system_settings')
            ->where('key', 'manager_auto_distribution_by_level')
            ->value('value');

        if (!is_string($raw) || trim($raw) === '') {
            $this->autoDistributionByLevel = [];
            return $this->autoDistributionByLevel;
        }

        $decoded = json_decode($raw, true);
        $this->autoDistributionByLevel = is_array($decoded) ? $decoded : [];

        return $this->autoDistributionByLevel;
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

            if (!(bool) ($manager->uses_level_system ?? true)) {
                return true;
            }

            $levels = AdminManagerLevelStore::getFor((int) $manager->id);
            return in_array($level, $levels, true);
        })->values();

        if ($eligible->isEmpty()) {
            return null;
        }

        // Веса распределения трафика: 0% исключает менеджера из ротации.
        $weights = \App\Support\ManagerTrafficAssigner::resolveWeights(
            $eligible->pluck('id')->map(fn ($v) => (int) $v)->all(),
            $level
        );

        if (empty($weights)) {
            return null;
        }

        $eligible = $eligible->filter(
            fn (AdminUser $m) => array_key_exists((int) $m->id, $weights)
        )->values();

        if ($eligible->isEmpty()) {
            return null;
        }

        // Считаем нагрузку только по чатам клиентов текущего уровня —
        // распределение работает на каждом уровне независимо.
        $chatCounts = DB::table('chats')
            ->join('users', 'users.id', '=', 'chats.user_id')
            ->selectRaw('chats.manager_id, COUNT(*) as c')
            ->whereIn('chats.manager_id', $eligible->pluck('id')->all())
            ->where('users.commission_level_id', $level)
            ->where(function ($q) {
                $q->whereNull('chats.status')->orWhere('chats.status', '!=', 'closed');
            })
            ->groupBy('chats.manager_id')
            ->pluck('c', 'chats.manager_id');

        $best = null;
        $bestScore = null;
        $bestCount = null;

        foreach ($eligible as $manager) {
            $id = (int) $manager->id;
            $count = (int) ($chatCounts[(string) $id] ?? ($chatCounts[$id] ?? 0));
            $weight = max(1, (int) ($weights[$id] ?? 1));
            $score = $count / $weight;

            if ($best === null
                || $score < $bestScore
                || ($score == $bestScore && $count < $bestCount)) {
                $best = $manager;
                $bestScore = $score;
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


    private function isHeicLikeImageUpload(UploadedFile $uploaded): bool
    {
        $ext = strtolower(trim((string) $uploaded->getClientOriginalExtension()));
        if (in_array($ext, ['heic', 'heif', 'heics'], true)) {
            return true;
        }

        $mimeClient = strtolower(trim((string) ($uploaded->getClientMimeType() ?? '')));
        $mimeServer = strtolower(trim((string) ($uploaded->getMimeType() ?? '')));

        return in_array($mimeClient, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true)
            or in_array($mimeServer, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true);
    }

    private function convertHeicToJpegTemp(UploadedFile $uploaded): ?array
    {
        $sourcePath = trim((string) $uploaded->getRealPath());
        if ($sourcePath === '' or !is_file($sourcePath)) {
            return null;
        }

        $tmpBase = tempnam(sys_get_temp_dir(), 'heic_');
        if (!is_string($tmpBase) or $tmpBase === '') {
            return null;
        }

        @unlink($tmpBase);
        $targetJpeg = $tmpBase.'.jpg';

        if (extension_loaded('imagick') and class_exists('Imagick')) {
            try {
                $image = new \Imagick($sourcePath);
                $image->setImageFormat('jpeg');
                $image->setImageCompressionQuality(88);
                if (method_exists($image, 'stripImage')) {
                    $image->stripImage();
                }
                $ok = $image->writeImage($targetJpeg);
                $image->clear();
                $image->destroy();

                if ($ok and is_file($targetJpeg) and filesize($targetJpeg) > 0) {
                    return [
                        'tmp_path' => $targetJpeg,
                        'extension' => 'jpg',
                        'mime' => 'image/jpeg',
                    ];
                }
            } catch (\Throwable $e) {
                // fallback to CLI converters
            }
        }

        $commands = [
            ['heif-convert', $sourcePath, $targetJpeg],
            ['ffmpeg', '-y', '-i', $sourcePath, '-frames:v', '1', '-q:v', '2', $targetJpeg],
            ['magick', $sourcePath, '-quality', '88', $targetJpeg],
            ['convert', $sourcePath, '-quality', '88', $targetJpeg],
        ];

        foreach ($commands as $parts) {
            if (!$this->runSafeCliCommand($parts)) {
                continue;
            }

            if (is_file($targetJpeg) and filesize($targetJpeg) > 0) {
                return [
                    'tmp_path' => $targetJpeg,
                    'extension' => 'jpg',
                    'mime' => 'image/jpeg',
                ];
            }
        }

        @unlink($targetJpeg);
        return null;
    }

    private function runSafeCliCommand(array $parts): bool
    {
        $escaped = [];
        foreach ($parts as $part) {
            $escaped[] = escapeshellarg((string) $part);
        }

        $cmd = implode(' ', $escaped).' >/dev/null 2>&1';
        $exitCode = 1;
        @exec($cmd, $output, $exitCode);

        return $exitCode === 0;
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

    /**
     * Шаблоны быстрых ответов менеджера. Раньше жили в localStorage браузера —
     * пользователи «теряли» их при входе с другого устройства. Теперь сервер:
     * system_settings, ключ на пользователя.
     */
    public function getQuickReplies(Request $request)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $raw = DB::table('system_settings')
            ->where('key', 'quick_replies:' . (int) $actor->id)
            ->value('value');

        $items = [];
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $items = $decoded;
        }

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function saveQuickReplies(Request $request)
    {
        $actor = $this->resolveCurrentAdminUser($request);
        if (!$actor) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }
        if ($this->isObserver($actor)) {
            return response()->json(['success' => false, 'message' => 'Read only'], 403);
        }

        $validated = $request->validate([
            'items' => 'present|array|max:60',
            'items.*.id' => 'required|string|max:64',
            'items.*.title' => 'required|string|max:200',
            'items.*.text' => 'required|string|max:5000',
            'items.*.category' => 'nullable|string|max:100',
        ]);

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'quick_replies:' . (int) $actor->id],
            ['value' => json_encode($validated['items'], JSON_UNESCAPED_UNICODE), 'updated_at' => now(), 'created_at' => now()]
        );

        return response()->json(['success' => true]);
    }
}
