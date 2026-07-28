<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\IbanSettingController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\CommissionLevelController;

// Test Sentry endpoint
Route::get("/test-sentry", function() {
    throw new \Exception("🔥 Test Sentry from API - " . now());
});

// Admin settings routes
Route::prefix('admin')->group(function () {
    // IBAN settings
    Route::get('settings/iban', [IbanSettingController::class, 'show']);
    Route::put('settings/iban', [IbanSettingController::class, 'update']);
    
    // Tags
    Route::get('tags', [TagController::class, 'index']);
    Route::post('tags', [TagController::class, 'store']);
    Route::delete('tags/{tag}', [TagController::class, 'destroy']);
    
    // Commission levels
    Route::get('commission-levels', [CommissionLevelController::class, 'index']);
    Route::put('commission-levels', [CommissionLevelController::class, 'update']);
});

// Auth routes
use App\Http\Controllers\Api\AuthController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
