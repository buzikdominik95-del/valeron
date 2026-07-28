<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = [
        'chat_id',
        'user_id',
        'manager_id',
        'message',
        'is_manager',
    ];

    protected $casts = [
        'is_manager' => 'boolean',
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }
}
