<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

        DB::transaction(function () use ($user) {
            $this->deleteChatsForUsers([$user->id]);
            $user->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Лид и его чаты удалены',
        ]);
    }

    public function destroyAll(): JsonResponse
    {
        DB::transaction(function () {
            $ids = User::query()->pluck('id')->all();
            $this->deleteChatsForUsers($ids);
            User::query()->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Все лиды удалены',
        ]);
    }

    /**
     * Чаты лида удаляем вместе с ним: сообщения, привязки тегов и сам чат —
     * иначе у админа и менеджеров остаются «мёртвые» диалоги без пользователя.
     */
    private function deleteChatsForUsers(array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $chatIds = DB::table('chats')->whereIn('user_id', $userIds)->pluck('id')->all();
        if ($chatIds === []) {
            return;
        }

        DB::table('chat_messages')->whereIn('chat_id', $chatIds)->delete();
        DB::table('chat_tag')->whereIn('chat_id', $chatIds)->delete();
        DB::table('chats')->whereIn('id', $chatIds)->delete();
    }
}
