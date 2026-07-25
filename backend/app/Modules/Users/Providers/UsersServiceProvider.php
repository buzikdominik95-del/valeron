<?php

namespace App\Modules\Users\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Users\Repositories\UserRepositoryInterface;
use App\Modules\Users\Repositories\UserRepository;
use App\Modules\Users\Services\DocumentService;

class UsersServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(DocumentService::class, DocumentService::class);
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/../Routes/api.php');
    }
}
