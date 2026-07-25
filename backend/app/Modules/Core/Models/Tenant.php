<?php

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tenant extends Model
{
    use HasFactory;

    protected $table = 'tenants';

    protected $fillable = ['name', 'slug', 'domain', 'status', 'theme_config', 'is_template'];

    protected $casts = ['theme_config' => 'json', 'is_template' => 'boolean'];

    public function users(): HasMany
    {
        return $this->hasMany(\App\Modules\Users\Models\User::class, 'tenant_id');
    }

    public function getThemeConfig(string $key, $default = null)
    {
        return data_get($this->theme_config, $key, $default);
    }

    public function updateThemeConfig(array $config): void
    {
        $this->update(['theme_config' => array_merge($this->theme_config ?? [], $config)]);
    }

    public function duplicate(string $newName, string $newDomain): self
    {
        return self::create([
            'name' => $newName,
            'domain' => $newDomain,
            'slug' => str_slug($newName),
            'status' => 'active',
            'theme_config' => $this->theme_config,
            'is_template' => false,
        ]);
    }
}
