<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TenantController extends Controller
{
    /**
     * Получить конфигурацию текущего тенанта
     */
    public function current(Request $request)
    {
        Log::info('✅ Getting current tenant configuration');

        $tenantConfig = [
            'id' => 1,
            'name' => 'Calipso',
            'logo' => '/images/logo.png',
            'favicon' => '/images/favicon.ico',
            'colors' => [
                'primary' => '#3498db',
                'secondary' => '#2ecc71',
                'accent' => '#e74c3c',
            ],
            'css_variables' => [
                '--color-primary' => '#3498db',
                '--color-secondary' => '#2ecc71',
                '--color-accent' => '#e74c3c',
                '--font-family' => 'sans-serif',
            ],
        ];

        Log::info('📦 Tenant config:', $tenantConfig);

        return response()->json([
            'success' => true,
            'data' => $tenantConfig,
        ]);
    }
}
