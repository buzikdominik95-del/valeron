<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IbanLevelSetting extends Model
{
    protected $fillable = [
        'level',
        'iban',
        'beneficiary_name',
        'bic_swift',
    ];

    /**
     * Возвращает реквизиты для уровня комиссии с fallback на глобальные.
     * Пустое поле на уровне означает "использовать глобальное значение".
     *
     * @return array{iban:string,beneficiary:string,swift:string}
     */
    public static function resolveForLevel(int $level, ?IbanSetting $global = null): array
    {
        $global = $global ?: IbanSetting::query()->first();

        $globalIban = strtoupper(preg_replace('/\s+/', '', (string) ($global?->global_iban ?? '')));
        $globalBeneficiary = trim((string) ($global?->beneficiary_name ?? ''));
        $globalSwift = strtoupper(trim((string) ($global?->bic_swift ?? '')));

        $row = self::query()->where('level', $level)->first();

        $iban = strtoupper(preg_replace('/\s+/', '', (string) ($row?->iban ?? '')));
        $beneficiary = trim((string) ($row?->beneficiary_name ?? ''));
        $swift = strtoupper(trim((string) ($row?->bic_swift ?? '')));

        return [
            'iban' => $iban !== '' ? $iban : $globalIban,
            'beneficiary' => $beneficiary !== '' ? $beneficiary : $globalBeneficiary,
            'swift' => $swift !== '' ? $swift : $globalSwift,
        ];
    }
}
