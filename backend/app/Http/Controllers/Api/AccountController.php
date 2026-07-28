<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
            'kind' => 'nullable|string',
            'level' => 'nullable|integer',
            'email' => 'nullable|email',
            'name' => 'nullable|string',
        ]);

        $user = Auth::user();
        
        // If not authenticated, find or create user by email
        if (!$user) {
            $email = $request->email ?: 'anonymous@it-velora.com';
            $name = $request->name ?: 'Anonymous';
            
            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => bcrypt(\Illuminate\Support\Str::random(32))]
            );
        }
        
        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $message = $chat->messages()->create([
            'sender_type' => 'user',
            'sender_id' => $user->id,
            'message' => $request->body,
            'is_read' => false,
        ]);

        $chat->touch();

        return response()->json([
            'ok' => true,
            'message' => [
                'id' => $message->id,
                'text' => $message->message,
                'created_at' => $message->created_at,
            ],
        ]);
    }

    public function getMessages(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            $email = $request->input('email', 'anonymous@it-velora.com');
            $user = User::where('email', $email)->first();
        }
        
        if (!$user) {
            return response()->json(['messages' => []]);
        }
        
        $chat = Chat::where('user_id', $user->id)->first();
        
        if (!$chat) {
            return response()->json(['messages' => []]);
        }

        $messages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'author' => $msg->sender_type === 'manager' ? 'agent' : 'client',
                    'text' => $msg->message,
                    'at' => $msg->created_at->toISOString(),
                    'delivery' => 'sent',
                ];
            });

        return response()->json(['messages' => $messages]);
    }
}
