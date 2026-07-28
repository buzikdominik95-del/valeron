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
        $users = User::orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name . ($user->surname ? ' ' . $user->surname : ''),
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'requested_amount' => $user->requested_amount ?? 0,
                    'document_type' => $user->document_type,
                    'document_number' => $user->document_number,
                    'status' => 'pending',
                    'created_at' => $user->created_at,
                    'chat_id' => null,
                    'manager' => null,
                    'commission_level' => 1,
                ];
            });

        $stats = [
            'total' => $users->count(),
            'today' => User::whereDate('created_at', today())->count(),
            'pending' => $users->where('status', 'pending')->count(),
            'approved' => 0,
        ];

        return response()->json([
            'users' => $users,
            'stats' => $stats,
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}
