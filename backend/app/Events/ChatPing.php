<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ChatPing implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public int $chatId)
    {
    }

    public function broadcastAs(): string
    {
        return 'chat.ping';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_id' => $this->chatId,
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.'.$this->chatId),
            new PrivateChannel('admin.chats'),
        ];
    }

    public static function safeDispatch(int $chatId): void
    {
        try {
            // Database and file cache stores do not create a missing key on increment.
            // Initialise it first so the lightweight admin real-time version always advances.
            \Illuminate\Support\Facades\Cache::add('admin_chats_index_ver', 0);
            \Illuminate\Support\Facades\Cache::increment('admin_chats_index_ver');
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            broadcast(new self($chatId));
        } catch (\Throwable $e) {
            Log::warning('ChatPing broadcast failed', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
