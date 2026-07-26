<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IbanSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class IbanSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = IbanSetting::first();
        
        return response()->json([
            'success' => true,
            'data' => $settings ?? [
                'global_iban' => '',
                'beneficiary_name' => '',
                'bic_swift' => '',
                'sepa_explanation' => ''
            ]
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'global_iban' => 'nullable|string|max:34',
            'beneficiary_name' => 'nullable|string|max:255',
            'bic_swift' => 'nullable|string|max:11',
            'sepa_explanation' => 'nullable|string|max:2000'
        ]);

        $settings = IbanSetting::first();
        
        if ($settings) {
            $settings->update($validated);
        } else {
            $settings = IbanSetting::create($validated);
        }

        return response()->json([
            'success' => true,
            'message' => 'Настройки IBAN сохранены',
            'data' => $settings
        ]);
    }
}
