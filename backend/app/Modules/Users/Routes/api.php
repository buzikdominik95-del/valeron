<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Users\Controllers\AuthController;
use App\Modules\Users\Controllers\UserController;
use App\Modules\Users\Controllers\DocumentController;
use App\Modules\Core\Models\Tenant;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->prefix('users')->group(function () {
    Route::get('profile', [UserController::class, 'profile']);
    Route::put('profile', [UserController::class, 'updateProfile']);
    
    Route::prefix('documents')->group(function () {
        Route::post('upload', [DocumentController::class, 'upload']);
        Route::get('/', [DocumentController::class, 'getAll']);
        Route::get('{type}', [DocumentController::class, 'getByType']);
        Route::delete('{documentId}', [DocumentController::class, 'delete']);
    });
});

// Public endpoint: Get current tenant config
Route::prefix('tenants')->get('/current', function (Illuminate\Http\Request $request) {
    $domain = $request->getHost();
    $tenant = Tenant::where('domain', $domain)->first();
    
    if (!$tenant) {
        return response()->json(['message' => 'Tenant not found', 'data' => null], 404);
    }
    
    return response()->json([
        'message' => 'Current tenant',
        'data' => [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domain,
            'status' => $tenant->status,
            'theme_config' => $tenant->theme_config ?? [],
            'is_template' => $tenant->is_template,
        ]
    ]);
});
