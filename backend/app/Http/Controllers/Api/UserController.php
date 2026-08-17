<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Support\AdminManagerLevelStore;
use App\Support\AdminUiPermissionStore;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = AdminUser::query()
            ->whereIn('role', ['manager', 'team_lead', 'observer'])
            ->select(['id', 'name', 'role', 'created_at', 'password_plain_encrypted'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AdminUser $user) => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => $user->role,
                'display_role' => (string) ($user->display_role ?? ''),
                'uses_level_system' => (bool) ($user->uses_level_system ?? true),
                'handled_levels' => AdminManagerLevelStore::getFor((int) $user->id),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
                'created_at' => $user->created_at,
                'work_time_seconds' => $user->created_at ? $user->created_at->diffInSeconds(now()) : 0,
                'password_known' => !empty($user->password_plain_encrypted),
                'password_mask' => !empty($user->password_plain_encrypted) ? '••••••••' : 'не задан',
                'login_path' => '/'.$this->toRouteSlug($user->name).'/',
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
            'role' => 'required|in:manager,team_lead,observer',
            'display_role' => 'nullable|string|max:120',
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

        $isObserverRole = ($validated['role'] ?? '') === 'observer';

        $usesLevelSystem = $isObserverRole
            ? false
            : (array_key_exists('uses_level_system', $validated)
                ? (bool) $validated['uses_level_system']
                : true);

        $plainPassword = (string) $validated['password'];

        $user = AdminUser::create([
            'name' => $validated['username'],
            'email' => $email,
            'password' => Hash::make($plainPassword),
            'password_plain_encrypted' => Crypt::encryptString($plainPassword),
            'role' => $validated['role'],
            'display_role' => trim((string) ($validated['display_role'] ?? '')),
            'is_active' => true,
            'uses_level_system' => $usesLevelSystem,
        ]);

        $hidden = $validated['hidden_elements'] ?? [];
        if ($isObserverRole) {
            $observerHidden = [
                'nav_monitoring',
                'nav_settings',
                'nav_tags',
                'tab_iban',
                'tab_users',
                'tab_managers',
                'tab_commissions',
                'tab_leads',
                'tab_tags',
                'action_delete',
                'action_toggle_manager',
                'action_edit_commission',
            ];
            $hidden = array_values(array_unique(array_merge($hidden, $observerHidden)));
        } elseif (($validated['role'] ?? '') === 'manager') {
            $hidden = array_values(array_unique(array_merge($hidden, $this->defaultManagerHiddenElements())));
        }
        AdminUiPermissionStore::setFor((int) $user->id, $hidden);

        $levels = $isObserverRole
            ? []
            : (is_array($validated['handled_levels'] ?? null) ? $validated['handled_levels'] : []);

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
                'display_role' => (string) ($user->display_role ?? ''),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
                'created_at' => $user->created_at,
                'password_known' => true,
                'password_mask' => '••••••••',
                'login_path' => '/'.$this->toRouteSlug($user->name).'/',
            ],
        ], 201);
    }

    public function showCredentials(int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead', 'observer'])->findOrFail($id);

        if (empty($user->password_plain_encrypted)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'username' => $user->name,
                    'password' => null,
                    'password_known' => false,
                    'created_at' => $user->created_at,
                ],
            ]);
        }

        try {
            $plain = Crypt::decryptString((string) $user->password_plain_encrypted);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось расшифровать пароль. Установите новый.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'username' => $user->name,
                'password' => $plain,
                'password_known' => true,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function updatePassword(Request $request, int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead', 'observer'])->findOrFail($id);

        $validated = $request->validate([
            'password' => 'required|string|min:6|max:255',
        ]);

        $plainPassword = (string) $validated['password'];
        $user->password = Hash::make($plainPassword);
        $user->password_plain_encrypted = Crypt::encryptString($plainPassword);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Пароль обновлен',
            'data' => [
                'id' => $user->id,
                'username' => $user->name,
                'password' => $plainPassword,
                'password_mask' => '••••••••',
                'password_known' => true,
            ],
        ]);
    }

    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead', 'observer'])->findOrFail($id);

        $validated = $request->validate([
            'hidden_elements' => 'required|array',
            'hidden_elements.*' => 'string|max:80',
            'uses_level_system' => 'nullable|boolean',
            'handled_levels' => 'nullable|array',
            'handled_levels.*' => 'integer|min:1|max:50',
        ]);

        AdminUiPermissionStore::setFor((int) $user->id, $validated['hidden_elements']);

        if ($user->role === 'observer') {
            $user->uses_level_system = false;
            $user->save();
            AdminManagerLevelStore::removeFor((int) $user->id);
        } else {
            if (array_key_exists('uses_level_system', $validated)) {
                $user->uses_level_system = (bool) $validated['uses_level_system'];
                $user->save();
            }

            if (array_key_exists('handled_levels', $validated)) {
                $levels = is_array($validated['handled_levels']) ? $validated['handled_levels'] : [];
                AdminManagerLevelStore::setFor((int) $user->id, $levels);
            }
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
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead', 'observer'])->findOrFail($id);

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

    private function toRouteSlug(string $value): string
    {
        $slug = mb_strtolower(trim($value));
        $slug = preg_replace('/\s+/', '_', $slug) ?? '';
        $slug = preg_replace('/[^a-z0-9_-]/', '', $slug) ?? '';
        $slug = preg_replace('/_+/', '_', $slug) ?? '';
        $slug = preg_replace('/-+/', '-', $slug) ?? '';
        $slug = trim($slug, '_-');

        return $slug !== '' ? $slug : 'manager';
    }

    private function defaultManagerHiddenElements(): array
    {
        return [
            'nav_monitoring',
            'tab_iban',
            'tab_users',
            'tab_managers',
            'tab_commissions',
            'tab_leads',
        ];
    }
}
