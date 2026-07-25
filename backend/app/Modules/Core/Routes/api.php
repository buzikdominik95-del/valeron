<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Core\Controllers\TenantController;

// Get current tenant (no additional prefix - already added in routes/api.php)
Route::get('/current', [TenantController::class, 'current'])->name('tenants.current');
