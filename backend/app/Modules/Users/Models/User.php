<?php

namespace App\Modules\Users\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'status',
        'avatar_path',
        'bio',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(\App\Modules\Payments\Models\Payment::class);
    }

    public function invoices(): HasMany
    public function commissions(): HasMany
    {
        return $this->hasMany(AppModulesCommissionsModelsCommission::class);
    }
    {
        return $this->hasMany(\App\Modules\Payments\Models\Invoice::class);
    }

    public function ibans(): HasMany
    {
        return $this->hasMany(Iban::class);
    }
}
