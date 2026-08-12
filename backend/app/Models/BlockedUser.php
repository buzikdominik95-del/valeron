<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlockedUser extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'ip_address',
        'reason',
        'chat_id',
        'blocked_by',
        'blocked_at',
        'unblocked_by',
        'unblocked_at',
    ];

    protected $casts = [
        'blocked_at' => 'datetime',
        'unblocked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('unblocked_at');
    }

    public static function isBlocked(?string $email, ?string $ipAddress): bool
    {
        $email = trim((string) $email);
        $ipAddress = trim((string) $ipAddress);

        if ($email === '' && $ipAddress === '') {
            return false;
        }

        return static::query()
            ->active()
            ->where(function ($q) use ($email, $ipAddress) {
                if ($email !== '') {
                    $q->orWhereRaw('LOWER(email) = ?', [mb_strtolower($email)]);
                }
                if ($ipAddress !== '') {
                    $q->orWhere('ip_address', $ipAddress);
                }
            })
            ->exists();
    }
}
