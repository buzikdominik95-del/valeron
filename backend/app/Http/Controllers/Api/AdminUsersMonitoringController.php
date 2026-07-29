<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminUsersMonitoringController extends Controller
{
    public function index()
    {
        $users = User::orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                $chatId = DB::table('chats')
                    ->where('user_id', $user->id)
                    ->orderByDesc('updated_at')
                    ->value('id');

                $unreadCount = 0;
                if ($chatId) {
                    $unreadCount = (int) DB::table('chat_messages')
                        ->where('chat_id', $chatId)
                        ->where('sender_type', '!=', 'manager')
                        ->where(function ($q) {
                            $q->whereNull('is_read');
                            $q->orWhere('is_read', false);
                        })
                        ->count();
                }

                $docStatus = DB::table('documents')
                    ->where('user_id', $user->id)
                    ->orderByDesc('created_at')
                    ->value('status');


                $leadProfileQuery = DB::table('leads')->where('user_id', $user->id);

                $userEmail = trim((string) ($user->email ?? ''));
                if ($userEmail !== '') {
                    $leadProfileQuery->orWhereRaw('LOWER(email) = ?', [mb_strtolower($userEmail)]);
                }

                $leadProfile = $leadProfileQuery
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->first(['credit_term_months', 'requested_amount', 'document_number', 'first_name', 'last_name', 'email', 'iban']);

                $resolvedName = trim((string) ($user->name ?? '') . ' ' . (string) ($user->surname ?? ''));
                if ($resolvedName === '') {
                    $resolvedName = trim((string) ($leadProfile?->first_name ?? '') . ' ' . (string) ($leadProfile?->last_name ?? ''));
                }

                $resolvedEmail = $user->email ?: ($leadProfile?->email ?? null);

                $resolvedRequestedAmount = $user->requested_amount;
                if (((float) ($resolvedRequestedAmount ?? 0)) <= 0 && isset($leadProfile?->requested_amount)) {
                    $resolvedRequestedAmount = $leadProfile->requested_amount;
                }

                $resolvedDocumentNumber = $user->document_number;
                if (empty($resolvedDocumentNumber) && !empty($leadProfile?->document_number)) {
                    $resolvedDocumentNumber = (string) $leadProfile->document_number;
                }

                $resolvedLeadIban = DB::table('ibans')
                    ->where('user_id', $user->id)
                    ->orderByDesc('is_default')
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->value('iban');

                if (empty($resolvedLeadIban) && !empty($leadProfile?->iban)) {
                    $resolvedLeadIban = (string) $leadProfile->iban;
                }

                if (!$docStatus and !empty($user->document_type) and !empty($resolvedDocumentNumber)) {
                    $docStatus = 'profile_filled';
                }

                $managerName = null;
                if (!empty($user->assigned_manager_id)) {
                    $managerName = DB::table('admin_users')
                        ->where('id', $user->assigned_manager_id)
                        ->value('name');
                }

                $loanTermMonths = $this->extractLoanTermMonths($user->wizard_progress ?? null);
                if (($loanTermMonths ?? 0) <= 0 && !empty($leadProfile?->credit_term_months)) {
                    $loanTermMonths = (int) $leadProfile->credit_term_months;
                }

                $commissionLevel = (int) ($user->commission_level_id ?? 1);
                $commissionLevelChanged = $commissionLevel > 1;

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
            'total' => $users->count(),
            'today' => User::whereDate('created_at', today())->count(),
            'pending' => $users->where('status', 'pending')->count(),
            'approved' => 0,
        ];

        return response()->json([
            'users' => $users,
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
