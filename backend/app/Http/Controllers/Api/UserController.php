<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->select(['id', 'name', 'created_at'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => 'manager',
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
            'username' => 'required|string|max:255|unique:users,name',
            'password' => 'required|string|min:6',
            'role' => 'required|in:manager,team_lead',
        ]);

        $user = User::create([
            'name' => $validated['username'],
            'email' => strtolower($validated['username']) . '@velora.local',
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Пользователь создан',
            'data' => [
                'id' => $user->id,
                'username' => $user->name,
                'role' => $validated['role'],
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Пользователь удалён',
        ]);
    }
}
