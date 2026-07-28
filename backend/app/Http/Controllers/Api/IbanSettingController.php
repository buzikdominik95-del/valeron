<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IbanSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IbanSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = IbanSetting::first();

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

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // frontend keys
            'iban' => 'nullable|string|max:34',
            'recipient_name' => 'nullable|string|max:255',
            'bic_swift' => 'nullable|string|max:11',
            'sepa_note' => 'nullable|string|max:2000',
            // legacy keys
            'global_iban' => 'nullable|string|max:34',
            'beneficiary_name' => 'nullable|string|max:255',
            'sepa_explanation' => 'nullable|string|max:2000',
        ]);

        $mapped = [
            'global_iban' => $validated['global_iban'] ?? $validated['iban'] ?? null,
            'beneficiary_name' => $validated['beneficiary_name'] ?? $validated['recipient_name'] ?? null,
            'bic_swift' => $validated['bic_swift'] ?? null,
            'sepa_explanation' => $validated['sepa_explanation'] ?? $validated['sepa_note'] ?? null,
        ];

        $settings = IbanSetting::first();
        if ($settings) {
            $settings->update($mapped);
            $settings->refresh();
        } else {
            $settings = IbanSetting::create($mapped);
        }

        return response()->json([
            'success' => true,
            'message' => 'Настройки IBAN сохранены',
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
