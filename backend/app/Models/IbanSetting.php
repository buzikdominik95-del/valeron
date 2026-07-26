<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IbanSetting extends Model
{
    protected $fillable = [
        'global_iban',
        'beneficiary_name',
        'bic_swift',
        'sepa_explanation'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
}
