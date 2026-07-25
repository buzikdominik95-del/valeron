<?php

namespace App\Modules\Users\Services;

use App\Modules\Users\Repositories\UserRepository;
use App\Modules\Users\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\AuthenticationException;

class AuthService
{
    protected $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function register(array $data): array
    {
        $data['password'] = Hash::make($data['password']);
        
        $user = $this->userRepository->create($data);

        return [
            'user' => $user,
            'token' => $this->generateToken($user),
        ];
    }

    public function login(array $data): array
    {
        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw new AuthenticationException('Invalid credentials');
        }

        if ($user->status !== 'active') {
            throw new AuthenticationException('Account is not active');
        }

        $user->update(['last_login_at' => now()]);

        return [
            'user' => $user,
            'token' => $this->generateToken($user),
        ];
    }

    public function logout(): void
    {
        auth('api')->logout();
    }

    protected function generateToken(User $user): string
    {
        return $user->createToken('calipso-token')->plainTextToken;
    }

    public function getCurrentUser(): ?User
    {
        return auth('sanctum')->user();
    }
}
