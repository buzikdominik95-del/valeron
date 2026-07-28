<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminChatsController extends Controller
{
    public function index()
    {
        $chats = Chat::with(['user'])
            ->select([
                'chats.*',
                DB::raw('(SELECT message FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg'),
                DB::raw('(SELECT created_at FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg_time')
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) {
                return [
                    'id' => $chat->id,
                    'lead_name' => $chat->user->name . ($chat->user->surname ? ' ' . $chat->user->surname : ''),
                    'lead_email' => $chat->user->email,
                    'lead_phone' => $chat->user->phone,
                    'loan_amount' => $chat->user->requested_amount ?? 0,
                    'document_type' => $chat->user->document_type,
                    'document_number' => $chat->user->document_number,
                    'last_msg' => $chat->last_msg,
                    'status' => $chat->status,
                    'unread_count' => 0,
                    'stage_name' => null,
                    'tags' => [],
                    'commission_level' => 1,
                    'updated_at' => $chat->last_msg_time ?? $chat->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $chats,
        ]);
    }

    public function show($id)
    {
        $chat = Chat::with(['user'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'chat' => [
                    'id' => $chat->id,
                    'lead_name' => $chat->user->name . ($chat->user->surname ? ' ' . $chat->user->surname : ''),
                    'lead_email' => $chat->user->email,
                    'lead_phone' => $chat->user->phone,
                    'loan_amount' => $chat->user->requested_amount ?? 0,
                    'document_type' => $chat->user->document_type,
                    'document_number' => $chat->user->document_number,
                    'stage_id' => null,
                    'manager_id' => $chat->manager_id,
                    'commission_level' => 1,
                    'notes' => '',
                ],
                'tags' => [],
            ],
        ]);
    }

    public function messages($chatId)
    {
        $chat = Chat::findOrFail($chatId);
        $messages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'message' => $msg->message,
                    'is_manager' => $msg->is_manager,
                    'sender_name' => $msg->is_manager ? 'Менеджер' : 'Клиент',
                    'created_at' => $msg->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    public function sendMessage(Request $request, $chatId)
    {
        $chat = Chat::findOrFail($chatId);
        
        $message = $chat->messages()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'manager',
            'sender_id' => 1, // TODO: use auth()->user()->id when auth is ready
            'message' => $request->message,
        ]);

        $chat->update([
            'last_message_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $message->id,
                'message' => $message->message,
                'is_manager' => true,
                'sender_name' => 'Менеджер',
                'created_at' => $message->created_at,
            ],
        ]);
    }

    public function updateMeta(Request $request, $chatId)
    {
        $chat = Chat::findOrFail($chatId);
        
        // Sync tags
        if ($request->has('tags')) {
            $chat->tags()->sync($request->tags);
        }
        
        // TODO: Save notes, commission_level, etc.
        
        return response()->json([
            'success' => true,
        ]);
    }
}
