<?php

namespace App\Http\Controllers\Api;

use Carbon\Carbon;

use App\Models\User;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminUsersMonitoringController extends Controller
{
    public function index()
    {
        $users = User::orderBy('created_at', 'desc')->get();

        if ($users->isEmpty()) {
            return response()->json([
                'users' => [],
                'stats' => [
                    'total' => 0,
                    'today' => 0,
                    'pending' => 0,
                    'approved' => 0,
                ],
            ])->header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        $userIds = $users->pluck('id')->map(fn ($v) => (int) $v)->values()->all();

        $usersById = [];
        $emailsByUserId = [];
        $emailToUserIds = [];
        $managerIds = [];

        foreach ($users as $user) {
            $uid = (int) $user->id;
            $usersById[$uid] = $user;

            $email = mb_strtolower(trim((string) ($user->email ?? '')));
            if ($email !== '') {
                $emailsByUserId[$uid] = $email;
                $emailToUserIds[$email] ??= [];
                $emailToUserIds[$email][] = $uid;
            }

            if (!empty($user->assigned_manager_id)) {
                $managerIds[] = (int) $user->assigned_manager_id;
            }
        }

        $managerNames = [];
        if (!empty($managerIds)) {
            $managerNames = DB::table('admin_users')
                ->whereIn('id', array_values(array_unique($managerIds)))
                ->pluck('name', 'id')
                ->all();
        }

        $latestChatByUser = [];
        $chatRows = DB::table('chats')
            ->whereIn('user_id', $userIds)
            ->orderBy('user_id')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['id', 'user_id']);

        foreach ($chatRows as $chatRow) {
            $uid = (int) $chatRow->user_id;
            if (!isset($latestChatByUser[$uid])) {
                $latestChatByUser[$uid] = (int) $chatRow->id;
            }
        }

        $chatIds = array_values($latestChatByUser);

        $unreadByChat = [];
        if (!empty($chatIds)) {
            $unreadByChat = DB::table('chat_messages')
                ->select('chat_id', DB::raw('COUNT(*) as unread_count'))
                ->whereIn('chat_id', $chatIds)
                ->where('sender_type', '!=', 'manager')
                ->where(function ($q) {
                    $q->whereNull('is_read')->orWhere('is_read', false);
                })
                ->groupBy('chat_id')
                ->pluck('unread_count', 'chat_id')
                ->map(fn ($v) => (int) $v)
                ->all();
        }

        $latestDocStatusByUser = [];
        $docRows = DB::table('documents')
            ->whereIn('user_id', $userIds)
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['user_id', 'status']);

        foreach ($docRows as $docRow) {
            $uid = (int) $docRow->user_id;
            if (!array_key_exists($uid, $latestDocStatusByUser)) {
                $latestDocStatusByUser[$uid] = $docRow->status;
            }
        }

        $leadRowsQuery = DB::table('leads')->whereIn('user_id', $userIds);

        $knownEmails = array_values(array_unique(array_values($emailsByUserId)));
        if (!empty($knownEmails)) {
            $leadRowsQuery->orWhereIn(DB::raw('LOWER(email)'), $knownEmails);
        }

        $leadRows = $leadRowsQuery
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['user_id', 'credit_term_months', 'requested_amount', 'document_number', 'first_name', 'last_name', 'email', 'iban']);

        $leadByUser = [];
        foreach ($leadRows as $leadRow) {
            $targets = [];

            $leadUserId = (int) ($leadRow->user_id ?? 0);
            if ($leadUserId > 0 and isset($usersById[$leadUserId])) {
                $targets[] = $leadUserId;
            }

            $leadEmail = mb_strtolower(trim((string) ($leadRow->email ?? '')));
            if ($leadEmail !== '' and isset($emailToUserIds[$leadEmail])) {
                $targets = array_merge($targets, $emailToUserIds[$leadEmail]);
            }

            foreach (array_unique($targets) as $uid) {
                if (!isset($leadByUser[$uid])) {
                    $leadByUser[$uid] = $leadRow;
                }
            }
        }

        $latestIbanByUser = [];
        $ibanRows = DB::table('ibans')
            ->whereIn('user_id', $userIds)
            ->orderBy('user_id')
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['user_id', 'iban']);

        foreach ($ibanRows as $ibanRow) {
            $uid = (int) $ibanRow->user_id;
            if (!isset($latestIbanByUser[$uid])) {
                $latestIbanByUser[$uid] = $ibanRow->iban;
            }
        }

        $lastSeenByUser = DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\Models\User')
            ->whereIn('tokenable_id', $userIds)
            ->groupBy('tokenable_id')
            ->select('tokenable_id', DB::raw('MAX(last_used_at) as last_used_at'))
            ->pluck('last_used_at', 'tokenable_id')
            ->all();

        $usersData = $users->map(function ($user) use ($latestChatByUser, $unreadByChat, $latestDocStatusByUser, $leadByUser, $latestIbanByUser, $managerNames, $lastSeenByUser) {
            $uid = (int) $user->id;

            $chatId = $latestChatByUser[$uid] ?? null;
            $unreadCount = $chatId ? (int) ($unreadByChat[$chatId] ?? 0) : 0;
            $docStatus = $latestDocStatusByUser[$uid] ?? null;
            $leadProfile = $leadByUser[$uid] ?? null;

            $resolvedName = trim((string) ($user->name ?? '') . ' ' . (string) ($user->surname ?? ''));
            if ($resolvedName === '') {
                $resolvedName = trim((string) ($leadProfile?->first_name ?? '') . ' ' . (string) ($leadProfile?->last_name ?? ''));
            }

            $resolvedEmail = $user->email ?: ($leadProfile?->email ?? null);

            $resolvedRequestedAmount = $user->requested_amount;
            if (((float) ($resolvedRequestedAmount ?? 0)) <= 0 and isset($leadProfile?->requested_amount)) {
                $resolvedRequestedAmount = $leadProfile->requested_amount;
            }

            $resolvedDocumentNumber = $user->document_number;
            if (empty($resolvedDocumentNumber) and !empty($leadProfile?->document_number)) {
                $resolvedDocumentNumber = (string) $leadProfile->document_number;
            }

            $resolvedLeadIban = $latestIbanByUser[$uid] ?? null;
            if (empty($resolvedLeadIban) and !empty($leadProfile?->iban)) {
                $resolvedLeadIban = (string) $leadProfile->iban;
            }

            if (!$docStatus and !empty($user->document_type) and !empty($resolvedDocumentNumber)) {
                $docStatus = 'profile_filled';
            }

            $managerName = null;
            if (!empty($user->assigned_manager_id)) {
                $managerName = $managerNames[(int) $user->assigned_manager_id] ?? null;
            }

            $loanTermMonths = $this->extractLoanTermMonths($user->wizard_progress ?? null);
            if (($loanTermMonths ?? 0) <= 0 and !empty($leadProfile?->credit_term_months)) {
                $loanTermMonths = (int) $leadProfile->credit_term_months;
            }

            $commissionLevel = (int) ($user->commission_level_id ?? 1);
            $commissionLevelChanged = $commissionLevel > 1;

            $lastSeenAt = $lastSeenByUser[$uid] ?? null;
            $isOnline = false;
            if (!empty($lastSeenAt)) {
                try {
                    $lastSeenUtc = Carbon::parse($lastSeenAt, 'UTC');
                    $isOnline = $lastSeenUtc->greaterThanOrEqualTo(now('UTC')->subMinutes(3));
                } catch (\Throwable $e) {
                    $isOnline = false;
                }
            }

            return [
                'id' => $user->id,
                'name' => $resolvedName !== '' ? $resolvedName : 'Без имени',
                'email' => $resolvedEmail,
                'requested_amount' => $resolvedRequestedAmount ?? 0,
                'loan_term_months' => $loanTermMonths,
                'document_type' => $user->document_type,
                'document_number' => $resolvedDocumentNumber,
                'lead_iban' => $resolvedLeadIban,
                'documents_status' => $docStatus,
                'status' => 'pending',
                'client_presence' => $isOnline ? 'online' : 'offline',
                'client_last_seen_at' => $lastSeenAt,
                'created_at' => $user->created_at,
                'chat_id' => $chatId,
                'has_unread_messages' => $unreadCount > 0,
                'unread_count' => $unreadCount,
                'manager' => $managerName,
                'commission_level' => $commissionLevel,
                'commission_level_changed' => $commissionLevelChanged,
            ];
        });

        $stats = [
            'total' => $usersData->count(),
            'today' => User::whereDate('created_at', today())->count(),
            'pending' => $usersData->where('status', 'pending')->count(),
            'approved' => 0,
        ];

        return response()->json([
            'users' => $usersData,
            'stats' => $stats,
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate');
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

        if (isset($data['credit']) and is_array($data['credit'])) {
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
}
