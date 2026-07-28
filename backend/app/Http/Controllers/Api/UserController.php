<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
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
        ]);

        $email = strtolower(preg_replace('/\s+/', '.', trim($validated['username']))) . '@admin.it-velora.com';

        if (AdminUser::where('email', $email)->exists()) {
            $email = strtolower(preg_replace('/\s+/', '.', trim($validated['username']))) . '.' . time() . '@admin.it-velora.com';
        }

        $user = AdminUser::create([
            'name' => $validated['username'],
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Пользователь создан',
            'data' => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => $user->role,
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = AdminUser::query()->whereIn('role', ['manager', 'team_lead'])->findOrFail($id);

        try {
            $user->delete();
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Нельзя удалить менеджера: есть связанные лиды/чаты.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Пользователь удалён',
        ]);
    }
}
