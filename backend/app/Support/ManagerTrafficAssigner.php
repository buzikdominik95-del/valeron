<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ManagerTrafficAssigner
{
    private const TRAFFIC_KEY = 'manager_traffic_distribution';

    public static function ensureUserAssignment(User $user): ?int
    {
        $currentId = (int) ($user->assigned_manager_id ?? 0);
        if ($currentId > 0 && self::isActiveManager($currentId)) {
            self::upsertLeadFromUser($user, $currentId);
            return $currentId;
        }

        $managerId = self::pickManagerId();
        if (!$managerId) {
            self::upsertLeadFromUser($user, null);
            return null;
        }

        $user->assigned_manager_id = $managerId;
        $user->save();

        self::upsertLeadFromUser($user, $managerId);

        return $managerId;
    }

    public static function pickManagerId(): ?int
    {
        $activeManagers = DB::table('admin_users')
            ->select(['id'])
            ->whereIn('role', ['manager', 'team_lead'])
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        if ($activeManagers->isEmpty()) {
            return null;
        }

        $weightsMap = self::getTrafficMap();

        $weights = [];
        foreach ($activeManagers as $manager) {
            $id = (int) $manager->id;
            $weight = (int) ($weightsMap[(string) $id] ?? 0);
            $weights[$id] = $weight > 0 ? $weight : 1;
        }

        $assignedCounts = DB::table('users')
            ->select('assigned_manager_id', DB::raw('COUNT(*) as cnt'))
            ->whereIn('assigned_manager_id', array_keys($weights))
            ->groupBy('assigned_manager_id')
            ->pluck('cnt', 'assigned_manager_id');

        $bestId = null;
        $bestScore = null;
        $bestCount = null;

        foreach ($weights as $managerId => $weight) {
            $count = (int) ($assignedCounts[(string) $managerId] ?? 0);
            $score = $count / max($weight, 1);

            if ($bestId === null || $score < $bestScore || ($score == $bestScore && $count < $bestCount) || ($score == $bestScore && $count == $bestCount && $managerId < $bestId)) {
                $bestId = $managerId;
                $bestScore = $score;
                $bestCount = $count;
            }
        }

        return $bestId;
    }

    private static function getTrafficMap(): array
    {
        $raw = DB::table('system_settings')->where('key', self::TRAFFIC_KEY)->value('value');
        if (!$raw) {
            return [];
        }

        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private static function isActiveManager(int $managerId): bool
    {
        return DB::table('admin_users')
            ->where('id', $managerId)
            ->whereIn('role', ['manager', 'team_lead'])
            ->where('is_active', true)
            ->exists();
    }

    private static function upsertLeadFromUser(User $user, ?int $managerId): void
    {
        $existingLead = DB::table('leads')
            ->where('user_id', (int) $user->id)
            ->first(['first_name', 'last_name', 'phone', 'requested_amount', 'document_number', 'credit_term_months']);

        $fullName = trim((string) ($user->name ?? ''));
        $parts = preg_split('/\s+/', $fullName, 2) ?: [];

        $existingFirst = trim((string) ($existingLead->first_name ?? ''));
        $existingLast = trim((string) ($existingLead->last_name ?? ''));

        $firstName = trim((string) ($parts[0] ?? $existingFirst ?: 'Cliente'));
        $lastName = trim((string) ($user->surname ?? ($parts[1] ?? $existingLast ?: 'Lead')));

        if ($firstName === '') {
            $firstName = $existingFirst !== '' ? $existingFirst : 'Cliente';
        }
        if ($lastName === '') {
            $lastName = $existingLast !== '' ? $existingLast : 'Lead';
        }

        $wizardProgress = self::decodeWizardProgress($user->wizard_progress ?? null);

        $requestedAmount = self::resolveRequestedAmount($user, $existingLead, $wizardProgress);
        $documentNumber = self::resolveDocumentNumber($user, $existingLead, $wizardProgress);
        $phone = self::pickString(
            $user->phone,
            $existingLead->phone ?? null,
            self::extractWizardString($wizardProgress, [
                ['phone'],
                ['phone_number'],
                ['contact', 'phone'],
                ['personal', 'phone'],
            ])
        );

        $payload = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => (string) $user->email,
            'phone' => $phone,
            'requested_amount' => $requestedAmount,
            'document_number' => $documentNumber,
            'commission_level_id' => (int) ($user->commission_level_id ?? 1),
            'assigned_manager_id' => $managerId,
            'status' => 'new',
            'updated_at' => now(),
        ];

        $termMonths = self::extractLoanTermMonths($wizardProgress);
        if (($termMonths ?? 0) > 0) {
            $payload['credit_term_months'] = $termMonths;
        } elseif (!empty($existingLead?->credit_term_months)) {
            $payload['credit_term_months'] = (int) $existingLead->credit_term_months;
        }

        DB::table('leads')->updateOrInsert(
            ['user_id' => (int) $user->id],
            $payload
        );
    }

    private static function decodeWizardProgress($raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }

        if (is_string($raw) && trim($raw) !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private static function resolveRequestedAmount(User $user, ?object $existingLead, array $wizardProgress): float
    {
        $fromUser = (float) ($user->requested_amount ?? 0);
        if ($fromUser > 0) {
            return $fromUser;
        }

        $fromWizard = self::extractWizardAmount($wizardProgress);
        if ($fromWizard > 0) {
            return $fromWizard;
        }

        $fromLead = (float) ($existingLead->requested_amount ?? 0);
        if ($fromLead > 0) {
            return $fromLead;
        }

        return 0.0;
    }

    private static function resolveDocumentNumber(User $user, ?object $existingLead, array $wizardProgress): ?string
    {
        $value = self::pickString(
            $user->document_number,
            self::extractWizardString($wizardProgress, [
                ['document_number'],
                ['doc_number'],
                ['document', 'number'],
                ['identity', 'number'],
            ]),
            $existingLead->document_number ?? null,
        );

        return $value === '' ? null : $value;
    }

    private static function pickString(...$candidates): string
    {
        foreach ($candidates as $candidate) {
            if (!is_scalar($candidate)) {
                continue;
            }

            $value = trim((string) $candidate);
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private static function extractWizardAmount(array $wizardProgress): float
    {
        $candidates = [
            $wizardProgress['requested_amount'] ?? null,
            $wizardProgress['amount'] ?? null,
            is_array($wizardProgress['credit'] ?? null) ? ($wizardProgress['credit']['amount'] ?? null) : null,
            is_array($wizardProgress['credit'] ?? null) ? ($wizardProgress['credit']['requested_amount'] ?? null) : null,
            is_array($wizardProgress['loan'] ?? null) ? ($wizardProgress['loan']['amount'] ?? null) : null,
            is_array($wizardProgress['simulation'] ?? null) ? ($wizardProgress['simulation']['amount'] ?? null) : null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_numeric($candidate)) {
                continue;
            }

            $value = (float) $candidate;
            if ($value > 0) {
                return $value;
            }
        }

        return 0.0;
    }

    private static function extractWizardString(array $wizardProgress, array $paths): ?string
    {
        foreach ($paths as $path) {
            $cursor = $wizardProgress;

            foreach ($path as $segment) {
                if (!is_array($cursor) || !array_key_exists($segment, $cursor)) {
                    $cursor = null;
                    break;
                }

                $cursor = $cursor[$segment];
            }

            if (is_scalar($cursor)) {
                $value = trim((string) $cursor);
                if ($value !== '') {
                    return $value;
                }
            }
        }

        return null;
    }

    private static function extractLoanTermMonths(array $wizardProgress): ?int
    {
        $keys = [
            'loan_term_months',
            'loan_term',
            'credit_term_months',
            'credit_term',
            'term_months',
            'term',
            'requested_term_months',
            'requested_term',
        ];

        foreach ($keys as $key) {
            if (!array_key_exists($key, $wizardProgress)) {
                continue;
            }

            $value = (int) $wizardProgress[$key];
            if ($value > 0) {
                return $value;
            }
        }

        if (isset($wizardProgress['credit']) && is_array($wizardProgress['credit'])) {
            foreach (['term_months', 'term', 'loan_term'] as $nestedKey) {
                if (!array_key_exists($nestedKey, $wizardProgress['credit'])) {
                    continue;
                }

                $value = (int) $wizardProgress['credit'][$nestedKey];
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }
}
