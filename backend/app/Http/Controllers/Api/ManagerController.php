<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Support\AdminManagerLevelStore;
use App\Support\AdminUiPermissionStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class ManagerController extends Controller
{
    private const TRAFFIC_KEY = 'manager_traffic_distribution';
    private const AUTO_BY_LEVEL_KEY = 'manager_auto_distribution_by_level';
    private const BASE_BY_LEVEL_KEY = 'manager_base_distribution_by_level';

    public function index(): JsonResponse
    {
        $trafficMap = $this->getTrafficMap();

        $managers = AdminUser::query()
            ->whereIn('role', ['manager', 'team_lead'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (AdminUser $manager) use ($trafficMap) {
                $totalLeads = DB::table('leads')->where('assigned_manager_id', $manager->id)->count();
                $leads24h = DB::table('leads')
                    ->where('assigned_manager_id', $manager->id)
                    ->where('created_at', '>=', now()->subDay())
                    ->count();
                $activeChats = DB::table('chats')
                    ->where('manager_id', $manager->id)
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', '!=', 'closed');
                    })
                    ->count();

                return [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'email' => $manager->email,
                    'role' => $manager->role,
                    'is_active' => (bool) $manager->is_active,
                    'hidden_elements' => AdminUiPermissionStore::getFor((int) $manager->id),
                    'uses_level_system' => (bool) ($manager->uses_level_system ?? true),
                    'handled_levels' => AdminManagerLevelStore::getFor((int) $manager->id),
                    'traffic_percent' => (int) ($trafficMap[(string) $manager->id] ?? 0),
                    'total_leads' => $totalLeads,
                    'leads_24h' => $leads24h,
                    'active_chats' => $activeChats,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $managers,
        ]);
    }

    public function getDistributionSettings(): JsonResponse
    {
        $levels = $this->getCommissionLevels();
        $autoMap = $this->getJsonMap(self::AUTO_BY_LEVEL_KEY);
        $baseMap = $this->getJsonMap(self::BASE_BY_LEVEL_KEY);

        $autoByLevel = [];
        $baseModeByLevel = [];

        foreach ($levels as $level) {
            $levelKey = (string) $level;
            $autoByLevel[$levelKey] = $this->normalizeBool($autoMap[$levelKey] ?? true);
            $baseModeByLevel[$levelKey] = $this->normalizeBaseMode($baseMap[$levelKey] ?? 'all');
        }

        return response()->json([
            'success' => true,
            'data' => [
                'levels' => $levels,
                'auto_by_level' => $autoByLevel,
                'base_mode_by_level' => $baseModeByLevel,
            ],
        ]);
    }

    public function updateDistributionSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'auto_by_level' => 'nullable|array',
            'base_mode_by_level' => 'nullable|array',
        ]);

        $autoInput = is_array($validated['auto_by_level'] ?? null) ? $validated['auto_by_level'] : [];
        $baseInput = is_array($validated['base_mode_by_level'] ?? null) ? $validated['base_mode_by_level'] : [];

        $autoByLevel = [];
        foreach ($autoInput as $k => $v) {
            $level = (int) $k;
            if ($level < 1) {
                continue;
            }
            $autoByLevel[(string) $level] = $this->normalizeBool($v);
        }

        $baseModeByLevel = [];
        foreach ($baseInput as $k => $v) {
            $level = (int) $k;
            if ($level < 1) {
                continue;
            }
            $baseModeByLevel[(string) $level] = $this->normalizeBaseMode($v);
        }

        $this->saveJsonMap(self::AUTO_BY_LEVEL_KEY, $autoByLevel);
        $this->saveJsonMap(self::BASE_BY_LEVEL_KEY, $baseModeByLevel);

        return response()->json([
            'success' => true,
            'message' => 'Настройки распределения сохранены',
            'data' => [
                'auto_by_level' => $autoByLevel,
                'base_mode_by_level' => $baseModeByLevel,
            ],
        ]);
    }

    public function toggleStatus(int $id): JsonResponse
    {
        $manager = AdminUser::query()->whereIn('role', ['manager', 'team_lead'])->findOrFail($id);
        $manager->is_active = !$manager->is_active;
        $manager->save();

        if (!$manager->is_active) {
            $map = $this->getTrafficMap();
            $map[(string) $manager->id] = 0;
            $this->saveTrafficMap($map);
        }

        return response()->json([
            'success' => true,
            'message' => $manager->is_active ? 'Менеджер активирован' : 'Менеджер деактивирован',
            'data' => [
                'id' => $manager->id,
                'is_active' => (bool) $manager->is_active,
            ],
        ]);
    }

    public function updateTraffic(Request $request, int $id): JsonResponse
    {
        $manager = AdminUser::query()->whereIn('role', ['manager', 'team_lead'])->findOrFail($id);

        $validated = $request->validate([
            'traffic_percent' => 'required|integer|min:0|max:100',
        ]);

        $map = $this->getTrafficMap();
        $map[(string) $manager->id] = (int) $validated['traffic_percent'];
        $this->saveTrafficMap($map);

        return response()->json([
            'success' => true,
            'message' => 'Процент трафика обновлён',
            'data' => [
                'id' => $manager->id,
                'traffic_percent' => (int) $validated['traffic_percent'],
            ],
        ]);
    }

    public function distributeExistingLeads(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'nullable|in:unassigned,all',
            'level' => 'nullable|integer|min:1|max:50',
        ]);

        $level = (int) ($validated['level'] ?? 1);
        if ($level < 1) {
            $level = 1;
        }

        $mode = array_key_exists('mode', $validated)
            ? (string) $validated['mode']
            : $this->getBaseModeForLevel($level);
        $mode = $this->normalizeBaseMode($mode);

        $managers = $this->getEligibleActiveManagersForLevel($level);

        if ($managers->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Нет активных менеджеров для уровня ' . $level,
                'data' => [
                    'level' => $level,
                ],
            ], 422);
        }

        $weights = [];
        if ($level === 1) {
            $trafficMap = $this->getTrafficMap();
            foreach ($managers as $manager) {
                $id = (int) $manager->id;
                $weights[$id] = max(0, (int) ($trafficMap[(string) $id] ?? 0));
            }

            $hasPositiveWeight = collect($weights)->contains(fn ($w) => $w > 0);
            if (!$hasPositiveWeight) {
                foreach ($weights as $id => $weight) {
                    $weights[$id] = 1;
                }
            }
        } else {
            foreach ($managers as $manager) {
                $weights[(int) $manager->id] = 1;
            }
        }

        $eligibleManagerIds = array_map('intval', array_keys($weights));

        $distributionCounts = DB::table('leads as l')
            ->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->select('l.assigned_manager_id', DB::raw('COUNT(*) as cnt'))
            ->whereIn('l.assigned_manager_id', $eligibleManagerIds)
            ->whereRaw('COALESCE(NULLIF(u.commission_level_id, 0), NULLIF(l.commission_level_id, 0), 1) = ?', [$level])
            ->groupBy('l.assigned_manager_id')
            ->pluck('cnt', 'l.assigned_manager_id')
            ->toArray();

        $currentCounts = [];
        foreach ($weights as $managerId => $weight) {
            $currentCounts[$managerId] = (int) ($distributionCounts[(string) $managerId] ?? $distributionCounts[$managerId] ?? 0);
        }

        if ($mode === 'all') {
            foreach (array_keys($currentCounts) as $k) {
                $currentCounts[$k] = 0;
            }
        }

        $leadQuery = DB::table('leads as l')
            ->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->whereRaw('COALESCE(NULLIF(u.commission_level_id, 0), NULLIF(l.commission_level_id, 0), 1) = ?', [$level]);

        if ($mode !== 'all') {
            $leadQuery->leftJoin('admin_users as au', 'au.id', '=', 'l.assigned_manager_id')
                ->where(function ($q) use ($eligibleManagerIds) {
                    $q->whereNull('l.assigned_manager_id')
                        ->orWhereNotIn('l.assigned_manager_id', $eligibleManagerIds)
                        ->orWhereNull('au.id')
                        ->orWhereNotIn('au.role', ['manager', 'team_lead'])
                        ->orWhere('au.is_active', false);
                });
        }

        $leads = $leadQuery
            ->select('l.id', 'l.user_id')
            ->orderBy('l.id')
            ->get();

        if ($leads->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Подходящие лиды для распределения не найдены',
                'data' => [
                    'processed' => 0,
                    'updated' => 0,
                    'mode' => $mode,
                    'level' => $level,
                ],
            ]);
        }

        $updated = 0;
        $processed = 0;
        $reassignedChats = 0;

        DB::beginTransaction();
        try {
            foreach ($leads as $lead) {
                $processed++;
                $managerId = $this->pickManagerByWeightedScore($currentCounts, $weights);
                if (!$managerId) {
                    continue;
                }

                DB::table('leads')
                    ->where('id', (int) $lead->id)
                    ->update([
                        'assigned_manager_id' => $managerId,
                        'updated_at' => now(),
                    ]);

                if (!empty($lead->user_id)) {
                    DB::table('users')
                        ->where('id', (int) $lead->user_id)
                        ->update([
                            'assigned_manager_id' => $managerId,
                            'updated_at' => now(),
                        ]);

                    $reassignedChats += DB::table('chats')
                        ->where('user_id', (int) $lead->user_id)
                        ->where(function ($q) use ($managerId) {
                            $q->whereNull('manager_id')
                                ->orWhere('manager_id', '!=', $managerId);
                        })
                        ->update([
                            'manager_id' => $managerId,
                            'updated_at' => now(),
                        ]);
                }

                $currentCounts[$managerId] = (int) ($currentCounts[$managerId] ?? 0) + 1;
                $updated++;
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Ошибка распределения лидов: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Распределение лидов завершено',
            'data' => [
                'processed' => $processed,
                'updated' => $updated,
                'reassigned_chats' => $reassignedChats,
                'mode' => $mode,
                'level' => $level,
                'distribution' => $level === 1 ? 'weighted' : 'equal',
            ],
        ]);
    }

    private function getEligibleActiveManagersForLevel(int $level)
    {
        if ($level < 1) {
            $level = 1;
        }

        return AdminUser::query()
            ->whereIn('role', ['manager', 'team_lead'])
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'name', 'uses_level_system'])
            ->filter(function (AdminUser $manager) use ($level) {
                if (!(bool) ($manager->uses_level_system ?? true)) {
                    return true;
                }

                $levels = AdminManagerLevelStore::getFor((int) $manager->id);
                return in_array($level, $levels, true);
            })
            ->values();
    }

    private function pickManagerByWeightedScore(array $counts, array $weights): ?int
    {
        $bestId = null;
        $bestScore = null;
        $bestCount = null;

        foreach ($weights as $managerId => $weight) {
            $safeWeight = max(1, (int) $weight);
            $count = (int) ($counts[$managerId] ?? 0);
            $score = $count / $safeWeight;

            if ($bestId === null) {
                $bestId = (int) $managerId;
                $bestScore = $score;
                $bestCount = $count;
                continue;
            }

            if ($score < $bestScore) {
                $bestId = (int) $managerId;
                $bestScore = $score;
                $bestCount = $count;
                continue;
            }

            if ($score == $bestScore) {
                if ($count < $bestCount) {
                    $bestId = (int) $managerId;
                    $bestScore = $score;
                    $bestCount = $count;
                    continue;
                }

                if ($count == $bestCount) {
                    if ((int) $managerId < (int) $bestId) {
                        $bestId = (int) $managerId;
                        $bestScore = $score;
                        $bestCount = $count;
                    }
                }
            }
        }

        return $bestId;
    }

    private function getCommissionLevels(): array
    {
        $columns = [];

        try {
            $columns = DB::getSchemaBuilder()->getColumnListing('commission_levels');
        } catch (Throwable $e) {
            $columns = [];
        }

        $column = null;
        if (in_array('level_number', $columns, true)) {
            $column = 'level_number';
        } elseif (in_array('order', $columns, true)) {
            $column = 'order';
        }

        if ($column === null) {
            return [1, 2, 3, 4, 5];
        }

        $levels = DB::table('commission_levels')
            ->whereNotNull($column)
            ->orderBy($column)
            ->pluck($column)
            ->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($levels)) {
            return [1, 2, 3, 4, 5];
        }

        return $levels;
    }

    private function normalizeBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value !== 0;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['0', 'false', 'off', 'no'], true)) {
                return false;
            }
            if (in_array($normalized, ['1', 'true', 'on', 'yes'], true)) {
                return true;
            }
        }

        return (bool) $value;
    }

    private function normalizeBaseMode($value): string
    {
        $mode = strtolower(trim((string) $value));
        if (in_array($mode, ['unassigned', 'all'], true)) {
            return $mode;
        }

        return 'all';
    }


    private function getBaseModeForLevel(int $level): string
    {
        if ($level < 1) {
            $level = 1;
        }

        $map = $this->getJsonMap(self::BASE_BY_LEVEL_KEY);
        $key = (string) $level;

        if (!array_key_exists($key, $map)) {
            return 'all';
        }

        return $this->normalizeBaseMode($map[$key]);
    }

    private function getJsonMap(string $key): array
    {
        $raw = DB::table('system_settings')->where('key', $key)->value('value');
        if (!$raw) {
            return [];
        }

        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function saveJsonMap(string $key, array $map): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => $key],
            [
                'value' => json_encode($map, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function getTrafficMap(): array
    {
        return $this->getJsonMap(self::TRAFFIC_KEY);
    }

    private function saveTrafficMap(array $map): void
    {
        $this->saveJsonMap(self::TRAFFIC_KEY, $map);
    }
}
