<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\IbanSettingController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\CommissionLevelController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminChatsController;
use App\Http\Controllers\Api\AdminUsersMonitoringController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ApprovalEmailController;
use App\Http\Controllers\Api\ResendWebhookController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminLeadController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\AdminCommissionController;
use App\Http\Controllers\Api\BlockedUserController;
use App\Http\Controllers\Api\AiManagerController;
use App\Http\Controllers\Api\MetaEventController;

$adminAuthRequire = filter_var(env('ADMIN_API_REQUIRE_AUTH', false), FILTER_VALIDATE_BOOL);

// Reverb: авторизация приватных каналов (POST /api/broadcasting/auth)
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Test Sentry endpoint
Route::get("/test-sentry", function() {
    throw new \Exception("🔥 Test Sentry from API - " . now());
});


// Liveness/readiness config health for document AI integration.
Route::get('/health', function () {
    $verifyUrl = trim((string) config('services.document_ai.verify_url', ''));
    $apiKey = trim((string) config('services.document_ai.api_key', ''));
    $enabled = (bool) config('services.document_ai.enabled', true);

    $checks = [
        'document_ai_enabled' => $enabled,
        'document_ai_verify_url_present' => $verifyUrl !== '',
        'document_ai_api_key_present' => $apiKey !== '',
    ];

    $ok = true;
    if ($enabled) {
        if ($checks['document_ai_verify_url_present'] !== true) {
            $ok = false;
        }
        if ($checks['document_ai_api_key_present'] !== true) {
            $ok = false;
        }
    }

    return response()->json([
        'success' => $ok,
        'service' => 'backend',
        'checks' => $checks,
    ], $ok ? 200 : 503);
});

// Client Auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/demo-login', [AuthController::class, 'login']); // alias for frontend

// Server-side Meta CAPI events (browser pixel disabled)
Route::post('/meta/events', [MetaEventController::class, 'store']);

// Client Account routes (protected)
Route::middleware(['auth:sanctum', 'not_blocked'])->group(function () {
    Route::post('/account/messages', [AccountController::class, 'sendMessage']);
    Route::get('/account', [AccountController::class, 'getAccount']);
    Route::get('/account/messages', [AccountController::class, 'getMessages']);
    Route::post('/account/iban', [AccountController::class, 'saveIban']);
    Route::post('/account/wizard-progress', [AccountController::class, 'saveWizardProgress']);
    Route::post('/account/contract/sign', [AccountController::class, 'sendSignedContract']);
    Route::post('/account/cpi/certificate/email', [AccountController::class, 'sendCpiCertificateEmail']);
    Route::post('/account/emails/withdraw-fail', [AccountController::class, 'sendWithdrawFailEmail']);
    Route::post('/users/documents/upload', [\App\Http\Controllers\Api\UserDocumentController::class, 'upload']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/email/send-code', [AuthController::class, 'sendEmailVerificationCode']);
    Route::post('/auth/email/verify-code', [AuthController::class, 'verifyEmailVerificationCode']);
    Route::post('/auth/email/change/send-code', [AuthController::class, 'sendEmailChangeCode']);
    Route::post('/auth/email/change/confirm', [AuthController::class, 'confirmEmailChange']);
    Route::post('/auth/password/change', [AuthController::class, 'changePassword']);
});

/*
 * Email «credito approvato»: SPA manda nome + importo, Laravel invia la mail.
 * Pubblico per demo/dev (barra fasi); in prod andrebbe dietro auth/admin.
 */
Route::post('account/emails/credit-approval', [ApprovalEmailController::class, 'sendCreditApproval']);

// Delivery tracking webhook (Resend)
Route::post('/webhooks/resend', [ResendWebhookController::class, 'handle']);

// Admin Auth routes
Route::post('/admin/auth/login', [AdminAuthController::class, 'login']);
$adminLogoutRoute = Route::post('/admin/auth/logout', [AdminAuthController::class, 'logout']);
$adminMeRoute = Route::get('/admin/auth/me', [AdminAuthController::class, 'me']);

if ($adminAuthRequire) {
    $adminMeRoute->middleware('auth:sanctum');
}

// Admin routes
$adminRoutes = Route::prefix('admin');
if ($adminAuthRequire) {
    $adminRoutes->middleware('auth:sanctum');
}

$adminRoutes->group(function () {
    // Chats
    Route::get('chats', [AdminChatsController::class, 'index']);
    Route::get('chats/{id}', [AdminChatsController::class, 'show']);
    Route::get('chats/{id}/messages', [AdminChatsController::class, 'messages']);
    Route::post('chats/{id}/messages', [AdminChatsController::class, 'sendMessage'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    Route::delete('chats/{id}/messages/{messageId}', [AdminChatsController::class, 'deleteMessage'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    Route::put('chats/{id}/meta', [AdminChatsController::class, 'updateMeta'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    // Шаблоны быстрых ответов: серверное хранение (переезд с localStorage)
    Route::get('quick-replies', [AdminChatsController::class, 'getQuickReplies']);
    Route::put('quick-replies', [AdminChatsController::class, 'saveQuickReplies'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    Route::post('chats/{id}/meta', [AdminChatsController::class, 'updateMeta'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    Route::post('chats/{id}/complete-transfer', [AdminChatsController::class, 'completeAndTransfer'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    
    // Stages (compat endpoint for legacy admin bundles)
    Route::get('stages', function () {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    });

    // Users monitoring
    Route::get('users-monitoring', [AdminUsersMonitoringController::class, 'index'])->middleware('admin.role:none,admin,super_admin');

    // Users
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store'])->middleware('admin.role:admin,super_admin');
    Route::delete('users/{id}', [UserController::class, 'destroy'])->middleware('admin.role:admin,super_admin');
    Route::put('users/{id}/permissions', [UserController::class, 'updatePermissions'])->middleware('admin.role:admin,super_admin');
    Route::get('users/{id}/credentials', [UserController::class, 'showCredentials'])->middleware('admin.role:admin,super_admin');
    Route::put('users/{id}/password', [UserController::class, 'updatePassword'])->middleware('admin.role:admin,super_admin');

    // Leads
    Route::get('leads', [AdminLeadController::class, 'index']);
    Route::get('leads/{id}', [AdminLeadController::class, 'show']);
    Route::delete('leads/{id}', [AdminLeadController::class, 'destroy'])->middleware('admin.role:admin,super_admin');
    Route::delete('leads', [AdminLeadController::class, 'destroyAll'])->middleware('admin.role:admin,super_admin');

    // Managers
    Route::get('managers', [ManagerController::class, 'index']);
    Route::post('managers/{id}/toggle-status', [ManagerController::class, 'toggleStatus'])->middleware('admin.role:admin,super_admin');
    Route::put('managers/{id}/traffic', [ManagerController::class, 'updateTraffic'])->middleware('admin.role:admin,super_admin');
    Route::get('managers/distribution-settings', [ManagerController::class, 'getDistributionSettings']);
    Route::put('managers/distribution-settings', [ManagerController::class, 'updateDistributionSettings'])->middleware('admin.role:admin,super_admin');
    Route::post('managers/distribution-settings', [ManagerController::class, 'updateDistributionSettings'])->middleware('admin.role:admin,super_admin');
    Route::post('managers/distribute-existing-leads', [ManagerController::class, 'distributeExistingLeads'])->middleware('admin.role:admin,super_admin');
    
    // IBAN settings
    Route::get('settings/iban', [IbanSettingController::class, 'show']);

    // AI Manager (proxy to AI orchestrator)
    Route::prefix('ai-manager')->middleware('admin.role:admin,super_admin')->group(function () {
        Route::get('health-snapshot', [AiManagerController::class, 'healthSnapshot']);
        Route::get('stats', [AiManagerController::class, 'stats']);
        Route::get('alerts/recent', [AiManagerController::class, 'alertsRecent']);
        Route::get('queue/aging', [AiManagerController::class, 'queueAging']);
        Route::get('sla', [AiManagerController::class, 'sla']);
        Route::get('escalations', [AiManagerController::class, 'escalations']);
        Route::get('escalations/overdue', [AiManagerController::class, 'escalationsOverdue']);
        Route::post('escalations/bulk-assign', [AiManagerController::class, 'bulkAssign']);
        Route::post('escalations/bulk-resolve', [AiManagerController::class, 'bulkResolve']);
        Route::post('escalations/{id}/assign', [AiManagerController::class, 'assignEscalation']);
        Route::post('escalations/{id}/resolve', [AiManagerController::class, 'resolveEscalation']);
        Route::get('personas', [AiManagerController::class, 'personas']);
        Route::post('personas', [AiManagerController::class, 'createPersona']);
        Route::put('personas/{id}', [AiManagerController::class, 'updatePersona']);
        Route::delete('personas/{id}', [AiManagerController::class, 'deletePersona']);
        Route::post('chat/suggest', [AiManagerController::class, 'suggestReply']);
        Route::get('chat/{id}/state', [AiManagerController::class, 'chatState']);
        Route::post('chat/{id}/takeover', [AiManagerController::class, 'takeover']);
        Route::post('chat/{id}/return-to-ai', [AiManagerController::class, 'returnToAi']);
        Route::get('local-settings', [AiManagerController::class, 'localSettings']);
        Route::post('local-settings', [AiManagerController::class, 'saveLocalSettings']);
        Route::get('workflows', [AiManagerController::class, 'workflows']);
        Route::post('workflows', [AiManagerController::class, 'createWorkflow']);
        Route::put('workflows/{id}', [AiManagerController::class, 'updateWorkflow']);
        Route::delete('workflows/{id}', [AiManagerController::class, 'deleteWorkflow']);
        Route::post('workflows/{id}/run', [AiManagerController::class, 'runWorkflow']);
        Route::get('workflow-runs', [AiManagerController::class, 'workflowRuns']);

        Route::get('settings', [AiManagerController::class, 'aiSettings']);
        Route::post('settings', [AiManagerController::class, 'saveAiSettings']);
    });

    Route::put('settings/iban', [IbanSettingController::class, 'update'])->middleware('admin.role:admin,super_admin');
    Route::post('settings/iban', [IbanSettingController::class, 'update'])->middleware('admin.role:admin,super_admin');
    
    // Tags
    Route::get('tags', [TagController::class, 'index']);
    Route::post('tags', [TagController::class, 'store'])->middleware('admin.role:admin,super_admin');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->middleware('admin.role:admin,super_admin');
    
    // Commission level advance (client L1-L4 switch)
    Route::post('commission/advance', [AdminCommissionController::class, 'advance'])->middleware('admin.role:admin,super_admin');

    // Blocked users
    Route::get('blocked-users', [BlockedUserController::class, 'index'])->middleware('admin.role:admin,super_admin');
    Route::post('blocked-users', [BlockedUserController::class, 'block'])->middleware('admin.role:manager,team_lead,none,admin,super_admin');
    Route::post('blocked-users/{id}/unblock', [BlockedUserController::class, 'unblock'])->middleware('admin.role:admin,super_admin');

    // Commission levels
    Route::get('commission-levels', [CommissionLevelController::class, 'index']);
    Route::post('commission-levels', [CommissionLevelController::class, 'store'])->middleware('admin.role:admin,super_admin');
    Route::put('commission-levels/{id}', [CommissionLevelController::class, 'update'])->middleware('admin.role:admin,super_admin');
    Route::delete('commission-levels/{id}', [CommissionLevelController::class, 'destroy'])->middleware('admin.role:admin,super_admin');
});

// TEMP: test routes are opt-in only (even in local/testing)
$enableTestAccountRoutes = filter_var(env('ENABLE_TEST_ACCOUNT_ROUTES', false), FILTER_VALIDATE_BOOL);
if ($enableTestAccountRoutes && app()->environment(['local', 'testing'])) {
    Route::post('/account/messages-test', [App\Http\Controllers\Api\AccountController::class, 'sendMessage']);
    Route::get('/account/messages-test', [App\Http\Controllers\Api\AccountController::class, 'getMessages']);
}

