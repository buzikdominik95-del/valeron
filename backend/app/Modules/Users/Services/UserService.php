<?php

namespace App\Modules\Users\Services;

use App\Modules\Users\Repositories\UserRepository;

class UserService
{
    protected $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function getCurrentUser()
    {
        // Get authenticated user
        return auth()->user();
    }

    public function getAllUsers()
    {
        return $this->userRepository->getAll();
    }

    public function getUserById($id)
    {
        return $this->userRepository->find($id);
    }
}
