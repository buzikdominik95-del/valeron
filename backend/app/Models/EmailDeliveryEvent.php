<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailDeliveryEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'provider_event_id',
        'message_id',
        'event_type',
        'status',
        'recipient',
        'subject',
        'occurred_at',
        'payload',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'payload' => 'array',
    ];
}
