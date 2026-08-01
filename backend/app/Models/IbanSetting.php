<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IbanSetting extends Model
{
    protected $fillable = [
        'global_iban',
        'beneficiary_name',
        'bic_swift',
        'sepa_explanation',
        'payment_lead_text',
        'payment_method_text',
        'payment_beneficiary_label',
        'payment_iban_label',
        'payment_swift_label',
        'payment_amount_label',
        'payment_receipt_text',
        'payment_confirm_text',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
}
