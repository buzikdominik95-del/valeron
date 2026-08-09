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
            broadcast(new self($chatId));
        } catch (\Throwable $e) {
            Log::warning('ChatPing broadcast failed', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
