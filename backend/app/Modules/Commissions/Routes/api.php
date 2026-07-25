<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Commissions\Controllers\CommissionController;

Route::middleware('auth:sanctum')->prefix('commissions')->group(function () {
    Route::get('/', [CommissionController::class, 'getMyCommissions']);
    Route::get('pending', [CommissionController::class, 'getPending']);
    Route::get('stats', [CommissionController::class, 'getStats']);
    Route::post('payout-request', [CommissionController::class, 'requestPayout']);
});
