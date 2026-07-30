<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = [
        'chat_id',
        'sender_type',
        'sender_id',
        'message',
        'attachment_kind',
        'attachment_name',
        'attachment_url',
        'attachment_mime',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }
    
    // Helper to check if message is from manager
    public function getIsManagerAttribute()
    {
        return $this->sender_type === 'manager';
    }
    
    // Helper to check if message is from user
    public function getIsUserAttribute()
    {
        return $this->sender_type === 'user';
    }
}
