<?php

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Models\IbanSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function getIbanSettings(): JsonResponse
    {
        $settings = IbanSetting::query()->first();

        $payload = [
            'iban' => $settings?->global_iban ?? '',
            'recipient_name' => $settings?->beneficiary_name ?? '',
            'bic_swift' => $settings?->bic_swift ?? '',
            'sepa_note' => $settings?->sepa_explanation ?? '',
            // legacy aliases
            'global_iban' => $settings?->global_iban ?? '',
            'beneficiary_name' => $settings?->beneficiary_name ?? '',
            'sepa_explanation' => $settings?->sepa_explanation ?? '',
        ];

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    public function updateIbanSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // frontend keys
            'iban' => 'nullable|string|max:34',
            'recipient_name' => 'nullable|string|max:255',
            'bic_swift' => 'nullable|string|max:11',
            'sepa_note' => 'nullable|string|max:2000',
            // aliases
            'beneficiary' => 'nullable|string|max:255',
            'recipient' => 'nullable|string|max:255',
            'swift' => 'nullable|string|max:11',
            'bic' => 'nullable|string|max:11',
            // legacy keys
            'global_iban' => 'nullable|string|max:34',
            'beneficiary_name' => 'nullable|string|max:255',
            'sepa_explanation' => 'nullable|string|max:2000',
        ]);

        $settings = IbanSetting::query()->first();
        if (!$settings) {
            $settings = new IbanSetting();
        }

        $pick = static function (array $source, array $keys, ?string $fallback = null): ?string {
            foreach ($keys as $key) {
                if (!array_key_exists($key, $source)) {
                    continue;
                }

                $value = $source[$key];
                if ($value === null) {
                    continue;
                }

                $value = trim((string) $value);
                if ($value === '') {
                    continue;
                }

                return $value;
            }

            return $fallback;
        };

        $globalIban = $pick($validated, ['iban', 'global_iban'], $settings->global_iban);
        $beneficiary = $pick($validated, ['recipient_name', 'beneficiary_name', 'beneficiary', 'recipient'], $settings->beneficiary_name);
        $bicSwift = $pick($validated, ['bic_swift', 'swift', 'bic'], $settings->bic_swift);
        $sepaNote = $pick($validated, ['sepa_note', 'sepa_explanation'], $settings->sepa_explanation);

        if ($globalIban !== null) {
            $globalIban = strtoupper((string) preg_replace('/\s+/', '', $globalIban));
        }
        if ($bicSwift !== null) {
            $bicSwift = strtoupper($bicSwift);
        }

        $settings->fill([
            'global_iban' => $globalIban,
            'beneficiary_name' => $beneficiary,
            'bic_swift' => $bicSwift,
            'sepa_explanation' => $sepaNote,
        ]);
        $settings->save();
        $settings->refresh();

        // backward compatibility for old admin module reads
        DB::table('system_settings')->updateOrInsert(['key' => 'global_iban'], ['value' => $settings->global_iban, 'updated_at' => now()]);
        DB::table('system_settings')->updateOrInsert(['key' => 'beneficiary_name'], ['value' => $settings->beneficiary_name, 'updated_at' => now()]);
        DB::table('system_settings')->updateOrInsert(['key' => 'bic_swift'], ['value' => $settings->bic_swift, 'updated_at' => now()]);
        DB::table('system_settings')->updateOrInsert(['key' => 'sepa_explanation'], ['value' => $settings->sepa_explanation, 'updated_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'IBAN настройки сохранены',
            'data' => [
                'iban' => $settings->global_iban,
                'recipient_name' => $settings->beneficiary_name,
                'bic_swift' => $settings->bic_swift,
                'sepa_note' => $settings->sepa_explanation,
                'global_iban' => $settings->global_iban,
                'beneficiary_name' => $settings->beneficiary_name,
                'sepa_explanation' => $settings->sepa_explanation,
            ],
        ]);
    }
}
