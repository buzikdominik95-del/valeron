<?php

return [

    'ai_orchestrator' => [
        'base_url' => env('AI_ORCHESTRATOR_BASE_URL', 'http://172.19.0.1:18080'),
        'admin_api_key' => env('AI_ORCHESTRATOR_ADMIN_API_KEY'),
        'service_api_key' => env('AI_ORCHESTRATOR_SERVICE_API_KEY'),
        'timeout' => (int) env('AI_ORCHESTRATOR_TIMEOUT', 20),
    ],


    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        'webhook_secret' => env('RESEND_WEBHOOK_SECRET'),
        'webhook_bearer' => env('RESEND_WEBHOOK_BEARER'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'document_ai' => [
        'enabled' => filter_var(env('DOCUMENT_AI_ENABLED', true), FILTER_VALIDATE_BOOL),
        'verify_url' => env('DOCUMENT_AI_VERIFY_URL', 'http://ai_orchestrator:8000/v1/documents/verify-image'),
        'verify_url_fallbacks' => env('DOCUMENT_AI_VERIFY_URL_FALLBACKS', ''),
        'api_key' => env('DOCUMENT_AI_API_KEY', ''),
        'timeout_sec' => env('DOCUMENT_AI_TIMEOUT_SEC', 35),
        'min_confidence' => env('DOCUMENT_AI_MIN_CONFIDENCE', 0.45),
    ],

];
