<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Admin\Controllers\AdminTenantController;

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin/tenants')->group(function () {
    Route::get('/', [AdminTenantController::class, 'index']);
    Route::post('/', [AdminTenantController::class, 'store']);
    Route::get('{tenant}', [AdminTenantController::class, 'show']);
    Route::put('{tenant}', [AdminTenantController::class, 'update']);
    Route::post('{tenant}/duplicate', [AdminTenantController::class, 'duplicate']);
    Route::put('{tenant}/theme', [AdminTenantController::class, 'updateTheme']);
});
