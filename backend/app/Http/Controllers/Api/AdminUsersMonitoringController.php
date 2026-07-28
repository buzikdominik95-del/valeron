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
                    'status' => 'pending', // TODO: add real status
                    'created_at' => $user->created_at,
                    'chat_id' => null, // TODO: get from chats table
                    'manager' => null,
                    'commission_level' => 1,
                ];
            });

        $stats = [
            'total' => $users->count(),
            'today' => User::whereDate('created_at', today())->count(),
            'pending' => $users->where('status', 'pending')->count(),
            'approved' => 0, // TODO: add real approved count
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users,
                'stats' => $stats,
            ],
        ]);
    }
}
