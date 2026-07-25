<?php

namespace App\Modules\Payments\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Payments\Services\PaymentService;

class PaymentsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentService::class, PaymentService::class);
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../Routes/api.php');
    }
}
