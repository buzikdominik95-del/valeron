<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class AdminChatsController extends Controller
{
    public function index()
    {
        $chats = Chat::with(['user', 'tags:id'])
            ->select([
                'chats.*',
                DB::raw('(SELECT message FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg'),
                DB::raw('(SELECT created_at FROM chat_messages WHERE chat_id = chats.id ORDER BY created_at DESC LIMIT 1) as last_msg_time')
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) {
                $unreadCount = $this->countUnreadClientMessages((int) $chat->id);

                return [
                    'id' => $chat->id,
                    'lead_name' => $this->formatLeadName($chat->user->name, $chat->user->surname),
                    'lead_email' => $chat->user->email,
                    'loan_amount' => $chat->user->requested_amount ?? 0,
                    'document_type' => $chat->user->document_type,
                    'document_number' => $chat->user->document_number,
                    'last_msg' => $chat->last_msg,
                    'status' => $chat->status,
                    'unread_count' => $unreadCount,
                    'has_unread_messages' => $unreadCount > 0,
                    'stage_name' => null,
                    'tags' => $chat->tags->pluck('id')->values(),
                    'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
                    'updated_at' => $chat->last_msg_time ?? $chat->updated_at,
                ];
            });

        return response()
            ->json([
                'success' => true,
                'data' => $chats,
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function show($id)
    {
        $chat = Chat::with(['user', 'tags:id'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'chat' => [
                    'id' => $chat->id,
                    'lead_name' => $this->formatLeadName($chat->user->name, $chat->user->surname),
                    'lead_email' => $chat->user->email,
                    'loan_amount' => $chat->user->requested_amount ?? 0,
                    'document_type' => $chat->user->document_type,
                    'document_number' => $chat->user->document_number,
                    'stage_id' => null,
                    'manager_id' => $chat->manager_id,
                    'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
                    'unread_count' => $this->countUnreadClientMessages((int) $chat->id),
                    'notes' => '',
                ],
                'tags' => $chat->tags->pluck('id')->values(),
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
                $isManager = false;
                if (($msg->sender_type ?? null) === 'manager') {
                    $isManager = true;
                }
                if ((bool) ($msg->is_manager ?? false)) {
                    $isManager = true;
                }

                return [
                    'id' => $msg->id,
                    'message' => $msg->message,
                    'is_manager' => $isManager,
                    'sender_name' => $isManager ? 'Менеджер' : 'Клиент',
                    'created_at' => $msg->created_at,
                    'is_read' => (bool) ($msg->is_read ?? false),
                ];
            });

        return response()
            ->json([
                'success' => true,
                'data' => $messages,
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function sendMessage(Request $request, $chatId)
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $chat = Chat::findOrFail($chatId);

        $message = $chat->messages()->create([
            'chat_id' => $chat->id,
            'sender_type' => 'manager',
            'sender_id' => 1,
            'message' => $request->message,
            'is_read' => true,
            'read_at' => now(),
        ]);

        DB::table('chat_messages')
            ->where('chat_id', $chat->id)
            ->where('sender_type', '!=', 'manager')
            ->where(function ($q) {
                $q->whereNull('is_read');
                $q->orWhere('is_read', false);
            })
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        $chat->update([
            'last_message_at' => now(),
            'updated_at' => now(),
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
        $chat = Chat::with('user')->findOrFail($chatId);

        $validated = $request->validate([
            'tags' => 'sometimes|array',
            'tags.*' => 'integer|exists:tags,id',
            'commission_level' => 'sometimes|integer|min:1',
            'notes' => 'sometimes|nullable|string|max:5000',
        ]);

        if (array_key_exists('tags', $validated)) {
            $chat->tags()->sync($validated['tags'] ?? []);
        }

        if (array_key_exists('commission_level', $validated)) {
            if ($chat->user) {
                $chat->user->commission_level_id = (int) $validated['commission_level'];
                $chat->user->save();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tags' => $chat->tags()->pluck('tags.id')->values(),
                'commission_level' => (int) ($chat->user->commission_level_id ?? 1),
            ],
        ]);
    }

    private function countUnreadClientMessages(int $chatId): int
    {
        return (int) DB::table('chat_messages')
            ->where('chat_id', $chatId)
            ->where('sender_type', '!=', 'manager')
            ->where(function ($q) {
                $q->whereNull('is_read');
                $q->orWhere('is_read', false);
            })
            ->count();
    }

    private function formatLeadName(?string $name, ?string $surname): string
    {
        $base = trim((string) $name);
        $tail = trim((string) $surname);

        if ($tail === '') {
            return $base;
        }

        $baseLower = mb_strtolower($base);
        $tailLower = mb_strtolower($tail);

        if (str_ends_with($baseLower, ' ' . $tailLower)) {
            return $base;
        }

        if ($baseLower === $tailLower) {
            return $base;
        }

        return trim($base . ' ' . $tail);
    }
}
