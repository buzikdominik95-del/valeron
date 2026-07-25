<?php

namespace App\Modules\Users\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Iban extends Model
{
    protected $fillable = [
        'user_id',
        'iban',
        'bic',
        'account_holder',
        'bank_name',
        'status',
        'is_default',
    ];

    protected $hidden = [
        'iban',
        'bic',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verify()
    {
        $this->update([
            'status' => 'verified',
            'verified_at' => now(),
        ]);
    }

    public function makeDefault()
    {
        $this->user->ibans()->update(['is_default' => false]);
        $this->update(['is_default' => true]);
    }
}
