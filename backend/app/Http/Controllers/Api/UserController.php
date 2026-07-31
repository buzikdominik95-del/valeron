<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Support\AdminManagerLevelStore;
use App\Support\AdminUiPermissionStore;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = AdminUser::query()
            ->whereIn('role', ['manager', 'team_lead'])
            ->select(['id', 'name', 'role', 'created_at'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AdminUser $user) => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => $user->role,
                'uses_level_system' => (bool) ($user->uses_level_system ?? true),
                'handled_levels' => AdminManagerLevelStore::getFor((int) $user->id),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
                'created_at' => $user->created_at,
            ]);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:admin_users,name',
            'password' => 'required|string|min:6',
            'role' => 'required|in:manager,team_lead',
            'hidden_elements' => 'nullable|array',
            'hidden_elements.*' => 'string|max:80',
            'uses_level_system' => 'nullable|boolean',
            'handled_levels' => 'nullable|array',
            'handled_levels.*' => 'integer|min:1|max:50',
        ]);

        $email = strtolower(preg_replace('/\s+/', '.', trim($validated['username']))) . '@admin.it-velora.com';
        if (AdminUser::where('email', $email)->exists()) {
            $email = strtolower(preg_replace('/\s+/', '.', trim($validated['username']))) . '.' . time() . '@admin.it-velora.com';
        }

        $usesLevelSystem = array_key_exists('uses_level_system', $validated)
            ? (bool) $validated['uses_level_system']
            : true;

        $user = AdminUser::create([
            'name' => $validated['username'],
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => true,
            'uses_level_system' => $usesLevelSystem,
        ]);

        $hidden = $validated['hidden_elements'] ?? [];
        AdminUiPermissionStore::setFor((int) $user->id, $hidden);

        $levels = is_array($validated['handled_levels'] ?? null) ? $validated['handled_levels'] : [];
        if ($usesLevelSystem) {
            AdminManagerLevelStore::setFor((int) $user->id, $levels);
        } else {
            AdminManagerLevelStore::removeFor((int) $user->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Пользователь создан',
            'data' => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => $user->role,
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead'])->findOrFail($id);

        $validated = $request->validate([
            'hidden_elements' => 'required|array',
            'hidden_elements.*' => 'string|max:80',
            'uses_level_system' => 'nullable|boolean',
            'handled_levels' => 'nullable|array',
            'handled_levels.*' => 'integer|min:1|max:50',
        ]);

        AdminUiPermissionStore::setFor((int) $user->id, $validated['hidden_elements']);

        if (array_key_exists('uses_level_system', $validated)) {
            $user->uses_level_system = (bool) $validated['uses_level_system'];
            $user->save();
        }

        if (array_key_exists('handled_levels', $validated)) {
            $levels = is_array($validated['handled_levels']) ? $validated['handled_levels'] : [];
            AdminManagerLevelStore::setFor((int) $user->id, $levels);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ограничения менеджера сохранены',
            'data' => [
                'id' => $user->id,
                'uses_level_system' => (bool) ($user->uses_level_system ?? true),
                'handled_levels' => AdminManagerLevelStore::getFor((int) $user->id),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
            ],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead'])->findOrFail($id);

        try {
            \DB::transaction(function () use ($user, $id) {
                \DB::table('users')->where('assigned_manager_id', $id)->update(['assigned_manager_id' => null]);
                \DB::table('leads')->where('assigned_manager_id', $id)->update(['assigned_manager_id' => null]);
                \DB::table('chats')->where('manager_id', $id)->update(['manager_id' => null]);

                $user->delete();
                AdminUiPermissionStore::removeFor($id);
            });
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось удалить менеджера: есть связанные записи.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Пользователь удалён',
        ]);
    }
}
