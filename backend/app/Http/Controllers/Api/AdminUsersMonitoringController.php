<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminUsersMonitoringController extends Controller
{
    public function index()
    {
        $stats = [
            'total' => User::count(),
            'today' => User::whereDate('created_at', today())->count(),
            'expected_commission' => User::sum('requested_amount') * 0.05,
            'blocked' => 0,
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
