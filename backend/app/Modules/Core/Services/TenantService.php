<?php

namespace App\Modules\Core\Services;

use App\Modules\Core\Models\Tenant;
use Illuminate\Support\Facades\Request;

class TenantService
{
    private ?Tenant $currentTenant = null;

    public function identify(): ?Tenant
    {
        if ($this->currentTenant) {
            return $this->currentTenant;
        }

        $domain = Request::getHost();
        $this->currentTenant = Tenant::where('domain', $domain)
            ->orWhere('domain', 'www.' . $domain)
            ->first();

        return $this->currentTenant;
    }

    public function getCurrentTenant(): ?Tenant
    {
        return $this->currentTenant ?? $this->identify();
    }

    public function setCurrentTenant(Tenant $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    public function createTenant(array $data): Tenant
    {
        return Tenant::create([
            'name' => $data['name'],
            'domain' => $data['domain'],
            'slug' => str_slug($data['name']),
            'status' => 'active',
            'theme_config' => $data['theme_config'] ?? [],
            'is_template' => $data['is_template'] ?? false,
        ]);
    }

    public function duplicateTenant(Tenant $source, array $newData): Tenant
    {
        return $source->duplicate($newData['name'], $newData['domain']);
    }

    public function getAllTenants()
    {
        return Tenant::all();
    }
}
