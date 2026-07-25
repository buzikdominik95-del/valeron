<?php

namespace App\Modules\Commissions\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Commission extends Model
{
    use HasFactory;

    protected $table = 'commissions';

    protected $fillable = [
        'user_id',
        'payment_id',
        'amount',
        'percentage',
        'status',
        'calculated_at',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'percentage' => 'decimal:4',
        'calculated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Users\Models\User::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Payments\Models\Payment::class);
    }

    public function markAsPaid(): void
    {
        $this->update(['status' => 'paid', 'paid_at' => now()]);
    }

    public function markAsPending(): void
    {
        $this->update(['status' => 'pending']);
    }
}
