<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Users\Services\AuthService;
use App\Modules\Users\Requests\RegisterRequest;
use App\Modules\Users\Requests\LoginRequest;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(RegisterRequest $request)
    {
        $user = $this->authService->register($request->validated());
        return response()->json(['user' => $user], 201);
    }

    public function login(LoginRequest $request)
    {
        $result = $this->authService->login($request->validated());
        return response()->json($result, 200);
    }

    public function logout()
    {
        $this->authService->logout();
        return response()->json(['message' => 'Logged out'], 200);
    }
}
