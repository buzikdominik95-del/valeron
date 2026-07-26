<?php

namespace App\Modules\Admin\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function getIbanSettings(): JsonResponse
    {
        $settings = DB::table('system_settings')
            ->whereIn('key', ['global_iban', 'beneficiary_name', 'bic_swift', 'sepa_explanation'])
            ->pluck('value', 'key');

        return response()->json([
            'success' => true,
            'data' => [
                'global_iban' => $settings['global_iban'] ?? '',
                'beneficiary_name' => $settings['beneficiary_name'] ?? '',
                'bic_swift' => $settings['bic_swift'] ?? '',
                'sepa_explanation' => $settings['sepa_explanation'] ?? ''
            ]
        ]);
    }

    public function updateIbanSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'global_iban' => 'nullable|string|max:50',
            'beneficiary_name' => 'nullable|string|max:255',
            'bic_swift' => 'nullable|string|max:20',
            'sepa_explanation' => 'nullable|string|max:2000'
        ]);

        foreach ($validated as $key => $value) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now()]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'IBAN настройки сохранены'
        ]);
    }
}
