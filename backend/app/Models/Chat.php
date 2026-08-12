<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    protected $fillable = [
        'user_id',
        'manager_id',
        'status',
        'last_message_at',
        'ai_mode',
        'ai_requires_human',
        'ai_last_reply_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'ai_requires_human' => 'boolean',
        'ai_last_reply_at' => 'datetime',
    ];



    protected static function booted(): void
    {
        static::created(function (Chat $chat): void {
            $fdTag = Tag::query()
                ->whereRaw('LOWER(name) = ?', ['fd'])
                ->first();

            if (!$fdTag) {
                return;
            }

            $chat->tags()->syncWithoutDetaching([$fdTag->id]);
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }
    
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'chat_tag');
    }
}
