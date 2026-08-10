<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BlockedUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = BlockedUser::query()
            ->whereNull('unblocked_at')
            ->orderByDesc('blocked_at')
            ->orderByDesc('id')
            ->get([
                'id',
                'email',
                'ip_address',
                'reason',
                'chat_id',
                'blocked_by',
                'blocked_at',
                'created_at',
            ]);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function block(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'chat_id' => 'nullable|integer',
            'email' => 'required|email',
            'ip_address' => 'nullable|string|max:45',
            'reason' => 'nullable|string|max:255',
            'force_logout' => 'nullable|boolean',
        ]);

        $email = mb_strtolower(trim((string) $validated['email']));
        $ip = trim((string) ($validated['ip_address'] ?? ''));

        $userIds = collect();

        try {
            $userIds = DB::table('users')
                ->whereRaw('LOWER(email) = ?', [$email])
                ->pluck('id');

            if ($ip === '' && $userIds->isNotEmpty()) {
                $lastSessionIp = DB::table('sessions')
                    ->whereIn('user_id', $userIds->all())
                    ->whereNotNull('ip_address')
                    ->orderByDesc('last_activity')
                    ->value('ip_address');

                if (is_string($lastSessionIp) && trim($lastSessionIp) !== '') {
                    $ip = trim($lastSessionIp);
                }
            }
        } catch (\Throwable $e) {
            // no-op
        }

        $existing = BlockedUser::query()
            ->whereNull('unblocked_at')
            ->where(function ($q) use ($email, $ip) {
                $q->whereRaw('LOWER(email) = ?', [$email]);
                if ($ip !== '') {
                    $q->orWhere('ip_address', $ip);
                }
            })
            ->first();

        if (!$existing) {
            $existing = BlockedUser::create([
                'chat_id' => $validated['chat_id'] ?? null,
                'email' => $email,
                'ip_address' => $ip !== '' ? $ip : null,
                'reason' => trim((string) ($validated['reason'] ?? 'Skull action')),
                'blocked_by' => (string) optional($request->user())->id,
                'blocked_at' => now(),
            ]);
        }

        if (($validated['force_logout'] ?? true) === true) {
            try {
                if ($userIds->isEmpty()) {
                    $userIds = DB::table('users')
                        ->whereRaw('LOWER(email) = ?', [$email])
                        ->pluck('id');
                }

                if ($userIds->isNotEmpty()) {
                    DB::table('personal_access_tokens')
                        ->whereIn('tokenable_id', $userIds->all())
                        ->whereIn('tokenable_type', ['App\\Models\\User'])
                        ->delete();

                    DB::table('sessions')
                        ->whereIn('user_id', $userIds->all())
                        ->delete();
                }
            } catch (\Throwable $e) {
                // no-op
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Пользователь заблокирован',
            'data' => $existing,
        ]);
    }

    public function unblock(Request $request, int $id): JsonResponse
    {
        $item = BlockedUser::query()->findOrFail($id);

        if ($item->unblocked_at === null) {
            $item->unblocked_at = now();
            $item->unblocked_by = (string) optional($request->user())->id;
            $item->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Блокировка снята',
            'data' => $item,
        ]);
    }
}
