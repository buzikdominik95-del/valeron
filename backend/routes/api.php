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
use App\Http\Controllers\Api\ApprovalEmailController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminLeadController;
use App\Http\Controllers\Api\ManagerController;

// Test Sentry endpoint
Route::get("/test-sentry", function() {
    throw new \Exception("🔥 Test Sentry from API - " . now());
});

// Client Auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/demo-login', [AuthController::class, 'login']); // alias for frontend

// Client Account routes (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/account/messages', [AccountController::class, 'sendMessage']);
    Route::get('/account', [AccountController::class, 'getAccount']);
    Route::get('/account/messages', [AccountController::class, 'getMessages']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

/*
 * Email «credito approvato»: SPA manda nome + importo, Laravel invia la mail.
 * Pubblico per demo/dev (barra fasi); in prod andrebbe dietro auth/admin.
 */
Route::post('account/emails/credit-approval', [ApprovalEmailController::class, 'sendCreditApproval']);

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

    // Users
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store']);
    Route::delete('users/{id}', [UserController::class, 'destroy']);

    // Leads
    Route::get('leads', [AdminLeadController::class, 'index']);
    Route::get('leads/{id}', [AdminLeadController::class, 'show']);
    Route::delete('leads/{id}', [AdminLeadController::class, 'destroy']);
    Route::delete('leads', [AdminLeadController::class, 'destroyAll']);

    // Managers
    Route::get('managers', [ManagerController::class, 'index']);
    Route::post('managers/{id}/toggle-status', [ManagerController::class, 'toggleStatus']);
    Route::put('managers/{id}/traffic', [ManagerController::class, 'updateTraffic']);
    
    // IBAN settings
    Route::get('settings/iban', [IbanSettingController::class, 'show']);
    Route::put('settings/iban', [IbanSettingController::class, 'update']);
    Route::post('settings/iban', [IbanSettingController::class, 'update']);
    
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

// TEMP: unprotected routes for testing
Route::post('/account/messages-test', [App\Http\Controllers\Api\AccountController::class, 'sendMessage']);
Route::get('/account/messages-test', [App\Http\Controllers\Api\AccountController::class, 'getMessages']);

// Admin chats routes (unprotected for now)
Route::prefix('admin')->group(function () {
    Route::get('/chats', [App\Http\Controllers\Api\AdminChatsController::class, 'index']);
    Route::get('/chats/{id}', [App\Http\Controllers\Api\AdminChatsController::class, 'show']);
    Route::get('/chats/{id}/messages', [App\Http\Controllers\Api\AdminChatsController::class, 'messages']);
    Route::post('/chats/{id}/messages', [App\Http\Controllers\Api\AdminChatsController::class, 'sendMessage']);
    Route::post('/chats/{id}/meta', [App\Http\Controllers\Api\AdminChatsController::class, 'updateMeta']);
});
