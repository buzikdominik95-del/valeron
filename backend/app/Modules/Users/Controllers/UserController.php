<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Users\Services\UserService;

class UserController extends Controller
{
    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function profile()
    {
        $user = $this->userService->getCurrentUser();
        return response()->json($user, 200);
    }

    public function updateProfile()
    {
        // Implementation
    }
}
