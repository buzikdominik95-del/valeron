<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Admin\Controllers\AdminTenantController;
use App\Modules\Admin\Controllers\SettingsController;
use App\Modules\Admin\Controllers\TagsController;
use App\Modules\Admin\Controllers\CommissionLevelsController;

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Tenants
    Route::prefix('tenants')->group(function () {
        Route::get('/', [AdminTenantController::class, 'index']);
        Route::post('/', [AdminTenantController::class, 'store']);
        Route::get('{tenant}', [AdminTenantController::class, 'show']);
        Route::put('{tenant}', [AdminTenantController::class, 'update']);
        Route::post('{tenant}/duplicate', [AdminTenantController::class, 'duplicate']);
        Route::put('{tenant}/theme', [AdminTenantController::class, 'updateTheme']);
    });

    // Settings
    Route::get('settings/iban', [SettingsController::class, 'getIbanSettings']);
    Route::put('settings/iban', [SettingsController::class, 'updateIbanSettings']);

    // Tags
    Route::get('tags', [TagsController::class, 'index']);
    Route::post('tags', [TagsController::class, 'store']);
    Route::delete('tags/{id}', [TagsController::class, 'destroy']);

    // Commission Levels
    Route::get('commission-levels', [CommissionLevelsController::class, 'index']);
    Route::put('commission-levels', [CommissionLevelsController::class, 'update']);
});

