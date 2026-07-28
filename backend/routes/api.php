<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\IbanSettingController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\CommissionLevelController;
use App\Http\Controllers\Api\ApprovalEmailController;

// Test Sentry endpoint
Route::get("/test-sentry", function() {
    throw new \Exception("🔥 Test Sentry from API - " . now());
});

/*
 * Email «credito approvato»: SPA manda nome + importo, Laravel invia la mail.
 * Pubblico per demo/dev (barra fasi); in prod andrebbe dietro auth/admin.
 */
Route::post('account/emails/credit-approval', [ApprovalEmailController::class, 'sendCreditApproval']);

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
