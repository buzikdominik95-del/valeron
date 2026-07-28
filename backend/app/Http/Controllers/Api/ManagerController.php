<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManagerController extends Controller
{
    private const TRAFFIC_KEY = 'manager_traffic_distribution';

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

    private function getTrafficMap(): array
    {
        $raw = DB::table('system_settings')->where('key', self::TRAFFIC_KEY)->value('value');
        if (!$raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function saveTrafficMap(array $map): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => self::TRAFFIC_KEY],
            [
                'value' => json_encode($map, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }
}
