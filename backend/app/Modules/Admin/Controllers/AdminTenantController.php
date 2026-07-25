<?php

namespace App\Modules\Admin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Core\Models\Tenant;
use App\Modules\Core\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTenantController extends Controller
{
    public function __construct(private TenantService $tenantService) {}

    public function index(): JsonResponse
    {
        $tenants = Tenant::all();
        return response()->json(['data' => $tenants]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'required|string|unique:tenants|max:255',
            'theme_config' => 'array',
            'is_template' => 'boolean',
        ]);

        $tenant = $this->tenantService->createTenant($validated);
        return response()->json(['data' => $tenant], 201);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json(['data' => $tenant]);
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'status' => 'in:active,inactive,suspended',
            'theme_config' => 'array',
        ]);

        $tenant->update($validated);
        return response()->json(['data' => $tenant]);
    }

    public function duplicate(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'required|string|unique:tenants|max:255',
        ]);

        $newTenant = $this->tenantService->duplicateTenant($tenant, $validated);
        return response()->json([
            'message' => 'Tenant duplicated successfully',
            'data' => $newTenant
        ], 201);
    }

    public function updateTheme(Request $request, Tenant $tenant): JsonResponse
    {
        $config = $request->validate([
            'primary_color' => 'string',
            'secondary_color' => 'string',
            'logo_url' => 'url',
            'favicon_url' => 'url',
            'custom_css' => 'string',
        ]);

        $tenant->updateThemeConfig($config);
        return response()->json(['data' => $tenant->fresh()]);
    }
}
