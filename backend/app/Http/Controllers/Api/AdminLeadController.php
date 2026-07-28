<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminLeadController extends Controller
{
    public function index(): JsonResponse
    {
        $leads = User::query()
            ->select(['id', 'email', 'created_at'])
            ->whereNotNull('email')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'email' => $user->email,
                'status' => 'new',
                'created_at' => $user->created_at,
            ]);

        return response()->json([
            'success' => true,
            'data' => $leads,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::query()->select(['id', 'email', 'created_at'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
                'status' => 'new',
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Лид удалён',
        ]);
    }

    public function destroyAll(): JsonResponse
    {
        User::query()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Все лиды удалены',
        ]);
    }
}
