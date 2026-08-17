<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

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

        $managerId = self::pickManagerId(max(1, (int) ($user->commission_level_id ?? 1)));
        if (!$managerId) {
            self::upsertLeadFromUser($user, null);
            return null;
        }

        $user->assigned_manager_id = $managerId;
        $user->save();

        self::upsertLeadFromUser($user, $managerId);

        return $managerId;
    }

    public static function pickManagerId(int $level = 1): ?int
    {
        $activeManagers = DB::table('admin_users')
            ->select(['id', 'uses_level_system'])
            ->whereIn('role', ['manager', 'team_lead'])
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        if ($activeManagers->isEmpty()) {
            return null;
        }

        // Учитываем уровни менеджеров: новые лиды падают только тем,
        // кто обрабатывает данный уровень (или не использует систему уровней).
        $activeManagers = $activeManagers->filter(function ($manager) use ($level) {
            if (!(bool) ($manager->uses_level_system ?? true)) {
                return true;
            }
            $levels = AdminManagerLevelStore::getFor((int) $manager->id);
            return in_array($level, $levels, true);
        })->values();

        if ($activeManagers->isEmpty()) {
            return null;
        }

        $weights = self::resolveWeights($activeManagers->pluck('id')->map(fn ($v) => (int) $v)->all(), $level);

        if (empty($weights)) {
            return null;
        }

        // Новые лиды распределяются строго по заданным процентам (smooth weighted
        // round-robin), независимо от исторического количества клиентов у менеджера.
        return self::pickBySmoothWeightedRoundRobin($weights, $level);
    }

    /**
     * Smooth weighted round-robin (как в nginx): на дистанции каждый менеджер
     * получает долю новых лидов, равную его весу. Состояние хранится в
     * system_settings под блокировкой строки (защита от гонок).
     *
     * @param array<int,int> $weights
     */
    private static function pickBySmoothWeightedRoundRobin(array $weights, int $level): ?int
    {
        if (empty($weights)) {
            return null;
        }

        return DB::transaction(function () use ($weights, $level) {
            $stateKey = 'manager_traffic_rr_state';

            $row = DB::table('system_settings')->where('key', $stateKey)->lockForUpdate()->first();
            $state = [];
            if ($row && $row->value) {
                $decoded = json_decode((string) $row->value, true);
                if (is_array($decoded)) {
                    $state = $decoded;
                }
            }

            $levelState = $state[(string) $level] ?? [];
            if (!is_array($levelState)) {
                $levelState = [];
            }

            // Баланс сохраняем только для актуальных участников распределения.
            $current = [];
            foreach ($weights as $id => $w) {
                $current[(string) $id] = (float) ($levelState[(string) $id] ?? 0);
            }

            $totalWeight = (float) array_sum($weights);

            $bestId = null;
            $bestVal = null;
            foreach ($weights as $id => $w) {
                $current[(string) $id] += (float) $w;
                $val = $current[(string) $id];
                if ($bestId === null || $val > $bestVal || ($val === $bestVal && (int) $id < $bestId)) {
                    $bestId = (int) $id;
                    $bestVal = $val;
                }
            }

            $current[(string) $bestId] -= $totalWeight;
            $state[(string) $level] = $current;

            DB::table('system_settings')->updateOrInsert(
                ['key' => $stateKey],
                ['value' => json_encode($state), 'updated_at' => now()]
            );

            return $bestId;
        });
    }

    /**
     * Возвращает веса трафика для менеджеров.
     * Менеджеры с явным весом 0 исключаются из распределения.
     * Если ни у кого нет положительного веса — все получают вес 1.
     *
     * @param array<int> $managerIds
     * @return array<int,int>
     */
    public static function resolveWeights(array $managerIds, ?int $level = null): array
    {
        $weightsMap = self::getTrafficMap();

        // Per-level значения приоритетны; для менеджеров без записи на уровне
        // остаётся их общий процент (как отображается в админке).
        if ($level !== null) {
            $byLevel = self::getTrafficByLevelMap();
            $levelMap = $byLevel[(string) $level] ?? $byLevel[$level] ?? null;
            if (is_array($levelMap)) {
                foreach ($levelMap as $mid => $pct) {
                    $weightsMap[(string) $mid] = $pct;
                }
            }
        }

        $weights = [];
        $hasPositive = false;
        foreach ($managerIds as $id) {
            $id = (int) $id;
            $raw = $weightsMap[(string) $id] ?? $weightsMap[$id] ?? null;
            $weight = $raw === null ? null : (int) $raw;
            if ($weight !== null && $weight <= 0) {
                // 0% — менеджер исключён из распределения
                continue;
            }
            if ($weight !== null && $weight > 0) {
                $hasPositive = true;
                $weights[$id] = $weight;
            } else {
                $weights[$id] = 1; // вес не задан
            }
        }

        if (empty($weights)) {
            return [];
        }

        // Если хоть у кого-то задан положительный вес, а у остальных не задан —
        // незаданные оставляем с весом 1 (участвуют, но с минимальным приоритетом).
        return $weights;
    }

    public static function getTrafficByLevelMap(): array
    {
        $raw = DB::table('system_settings')->where('key', 'manager_traffic_by_level')->value('value');
        if (!$raw) {
            return [];
        }

        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
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

        try {
            DB::table('leads')->updateOrInsert(
                ['user_id' => (int) $user->id],
                $payload
            );
        } catch (QueryException $e) {
            $state = (string) ($e->errorInfo[0] ?? '');
            $constraint = (string) ($e->errorInfo[2] ?? '');

            if ($state === '23505' && str_contains($constraint, 'leads_pkey')) {
                self::syncLeadIdSequence();

                DB::table('leads')->updateOrInsert(
                    ['user_id' => (int) $user->id],
                    $payload
                );

                return;
            }

            throw $e;
        }
    }

    private static function syncLeadIdSequence(): void
    {
        $sequence = DB::scalar("SELECT pg_get_serial_sequence('leads', 'id')");
        if (!is_string($sequence) || trim($sequence) === '') {
            return;
        }

        DB::statement(
            "SELECT setval(?, COALESCE((SELECT MAX(id) FROM leads), 1), true)",
            [$sequence]
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
