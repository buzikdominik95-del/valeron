<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\IbanSettingController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\CommissionLevelController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminChatsController;
use App\Http\Controllers\Api\AdminUsersMonitoringController;
use App\Http\Controllers\Api\AccountController;

// Test Sentry endpoint
Route::get("/test-sentry", function() {
    throw new \Exception("🔥 Test Sentry from API - " . now());
});

// Client Auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Client Account routes (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/account/messages', [AccountController::class, 'sendMessage']);
    Route::get('/account/messages', [AccountController::class, 'getMessages']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// Admin Auth routes
Route::post('/admin/auth/login', [AdminAuthController::class, 'login']);
Route::post('/admin/auth/logout', [AdminAuthController::class, 'logout']);
Route::get('/admin/auth/me', [AdminAuthController::class, 'me']);

// Admin routes
Route::prefix('admin')->group(function () {
    // Chats
    Route::get('chats', [AdminChatsController::class, 'index']);
    Route::get('chats/{id}', [AdminChatsController::class, 'show']);
    Route::get('chats/{id}/messages', [AdminChatsController::class, 'messages']);
    Route::post('chats/{id}/messages', [AdminChatsController::class, 'sendMessage']);
    Route::put('chats/{id}/meta', [AdminChatsController::class, 'updateMeta']);
    
    // Users monitoring
    Route::get('users-monitoring', [AdminUsersMonitoringController::class, 'index']);
    
    // IBAN settings
    Route::get('settings/iban', [IbanSettingController::class, 'show']);
    Route::put('settings/iban', [IbanSettingController::class, 'update']);
    
    // Tags
    Route::get('tags', [TagController::class, 'index']);
    Route::post('tags', [TagController::class, 'store']);
    Route::delete('tags/{tag}', [TagController::class, 'destroy']);
    
    // Commission levels
    Route::get('commission-levels', [CommissionLevelController::class, 'index']);
    Route::post('commission-levels', [CommissionLevelController::class, 'store']);
    Route::put('commission-levels/{id}', [CommissionLevelController::class, 'update']);
    Route::delete('commission-levels/{id}', [CommissionLevelController::class, 'destroy']);
});
