<?php

namespace App\Modules\Core\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Modules\Core\Models\Tenant;

class TenantController
{
    /**
     * Get current tenant config (for frontend theme)
     */
    public function current(Request $request): JsonResponse
    {
        try {
            // Get domain from request
            $domain = $request->getHost();
            
            // Find tenant by domain
            $tenant = Tenant::where('domain', $domain)->first();

            if (!$tenant) {
                return response()->json([
                    'message' => 'Tenant not found',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'message' => 'Current tenant',
                'data' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'domain' => $tenant->domain,
                    'status' => $tenant->status,
                    'theme_config' => $tenant->theme_config ?? [],
                    'is_template' => $tenant->is_template,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching tenant',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
