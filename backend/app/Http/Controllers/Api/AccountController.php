<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    /**
     * Send a message from the authenticated user to their chat
     */
    public function sendMessage(Request $request)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
            'kind' => 'nullable|string',
            'level' => 'nullable|integer',
        ]);

        $user = Auth::user();
        
        // Get or create chat for this user
        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        // Create message from user
        $message = $chat->messages()->create([
            'sender_type' => 'user',
            'sender_id' => $user->id,
            'message' => $request->body,
            'is_read' => false,
        ]);

        // Update chat timestamp
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

    /**
     * Get chat messages for the authenticated user
     */
    public function getMessages(Request $request)
    {
        $user = Auth::user();
        
        $chat = Chat::where('user_id', $user->id)->first();
        
        if (!$chat) {
            return response()->json([
                'messages' => [],
            ]);
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

        return response()->json([
            'messages' => $messages,
        ]);
    }
}
