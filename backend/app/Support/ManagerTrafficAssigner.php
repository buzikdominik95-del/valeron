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
        $fullName = trim((string) ($user->name ?? ''));
        $parts = preg_split('/\s+/', $fullName, 2) ?: [];

        $firstName = trim((string) ($parts[0] ?? 'Cliente'));
        $lastName = trim((string) ($user->surname ?? ($parts[1] ?? 'Lead')));

        if ($firstName === '') {
            $firstName = 'Cliente';
        }
        if ($lastName === '') {
            $lastName = 'Lead';
        }

        DB::table('leads')->updateOrInsert(
            ['user_id' => (int) $user->id],
            [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => (string) $user->email,
                'phone' => $user->phone,
                'requested_amount' => (float) ($user->requested_amount ?? 0),
                'document_number' => $user->document_number,
                'commission_level_id' => (int) ($user->commission_level_id ?? 1),
                'assigned_manager_id' => $managerId,
                'status' => 'new',
                'updated_at' => now(),
            ]
        );
    }
}
