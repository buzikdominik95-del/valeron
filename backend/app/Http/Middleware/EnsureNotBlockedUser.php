<?php

namespace App\Http\Middleware;

use App\Models\BlockedUser;
use App\Support\ClientIp;
use Closure;
use Illuminate\Http\Request;

class EnsureNotBlockedUser
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $email = trim((string) ($user->email ?? ''));
        $ip = trim(ClientIp::from($request));

        if (!BlockedUser::isBlocked($email, $ip)) {
            return $next($request);
        }

        try {
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }
        } catch (\Throwable $e) {
            // no-op
        }

        return response()->json([
            'message' => 'Account blocked',
            'blocked' => true,
        ], 423);
    }
}
