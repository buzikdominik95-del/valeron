<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Payments\Controllers\PaymentController;

Route::middleware('auth:sanctum')->prefix('payments')->group(function () {
    Route::post('create', [PaymentController::class, 'createPayment']);
    Route::get('/', [PaymentController::class, 'getPayments']);
    Route::post('{paymentId}/refund', [PaymentController::class, 'refundPayment']);
    
    Route::prefix('invoices')->group(function () {
        Route::post('create', [PaymentController::class, 'createInvoice']);
        Route::get('/', [PaymentController::class, 'getInvoices']);
    });
});
