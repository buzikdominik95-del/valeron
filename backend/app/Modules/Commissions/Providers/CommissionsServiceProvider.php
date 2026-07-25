<?php

namespace App\Modules\Commissions\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Commissions\Services\CommissionService;

class CommissionsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(CommissionService::class, CommissionService::class);
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../Routes/api.php');
    }
}
