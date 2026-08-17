<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Support\AdminManagerLevelStore;
use App\Support\AdminUiPermissionStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $login = trim((string) $request->login);

        $admin = AdminUser::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($login)])
            ->orWhere('name', $login)
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!Hash::check($request->password, $admin->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$admin->is_active) {
            return response()->json(['message' => 'Account is inactive'], 403);
        }

        $token = $admin->createToken('admin_token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'uses_level_system' => (bool) ($admin->uses_level_system ?? true),
                'handled_levels' => AdminManagerLevelStore::getFor((int) $admin->id),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $admin->id),
                'display_role' => (string) ($admin->display_role ?? ''),
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (!$user) {
            return response()->json(['message' => 'Already logged out']);
        }

        $token = $user->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'admin',
                'uses_level_system' => (bool) ($user->uses_level_system ?? true),
                'handled_levels' => AdminManagerLevelStore::getFor((int) $user->id),
                'hidden_elements' => AdminUiPermissionStore::getFor((int) $user->id),
                'display_role' => (string) ($user->display_role ?? ''),
            ],
        ]);
    }
}
