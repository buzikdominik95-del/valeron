<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class RequireAdminRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user('sanctum') ?? $request->user();

        if (!$user instanceof AdminUser) {
            $token = trim((string) ($request->bearerToken() ?? ''));
            if ($token === '') {
                $token = trim((string) $request->header('X-Admin-Token', ''));
            }

            if (str_starts_with(strtolower($token), 'bearer ')) {
                $token = trim(substr($token, 7));
            }

            if ($token !== '' && !in_array(strtolower($token), ['null', 'undefined'], true)) {
                $accessToken = PersonalAccessToken::findToken($token);
                $tokenable = $accessToken?->tokenable;
                if ($tokenable instanceof AdminUser) {
                    $user = $tokenable;
                }
            }
        }

        if (!$user instanceof AdminUser) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!empty($roles) && !in_array((string) ($user->role ?? ''), $roles, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
