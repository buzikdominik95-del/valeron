<?php

namespace App\Http\Middleware;

use Closure;
use App\Modules\Core\Services\TenantService;
use Illuminate\Http\Request;

class IdentifyTenant
{
    public function __construct(private TenantService $tenantService) {}

    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->tenantService->identify();
        
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        return $next($request);
    }
}
