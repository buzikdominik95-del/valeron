<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionLevel extends Model
{
    protected $fillable = [
        'name',
        'amount',
        'approved_amount_bonus',
        'order',
        'description',
        'callout_title',
        'callout_body',
        'help_modal_title',
        'help_modal_body',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'approved_amount_bonus' => 'decimal:2',
        'order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
