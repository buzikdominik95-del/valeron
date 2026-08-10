<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta Conversions API (server-side): шлём событие ТОЛЬКО при реальном
 * создании аккаунта в БД — рекламщики видят честные регистрации,
 * а не клики по кнопке на фронте.
 */
class MetaConversionsApi
{
    private const PIXEL_ID = '1013720174870447';

    public static function sendCompleteRegistration(
        string $email,
        ?string $clientIp,
        ?string $userAgent,
        ?string $fbp = null,
        ?string $fbc = null,
    ): void {
        $token = (string) env('META_CAPI_TOKEN', '');
        if ($token === '') {
            return;
        }

        $userData = [
            'em' => [hash('sha256', strtolower(trim($email)))],
        ];
        if ($clientIp) $userData['client_ip_address'] = $clientIp;
        if ($userAgent) $userData['client_user_agent'] = $userAgent;
        if ($fbp) $userData['fbp'] = $fbp;
        if ($fbc) $userData['fbc'] = $fbc;

        $payload = [
            'data' => [[
                'event_name' => 'CompleteRegistration',
                'event_time' => time(),
                'event_id' => 'reg_' . hash('sha256', strtolower(trim($email))),
                'action_source' => 'website',
                'event_source_url' => 'https://velorafinanza.com/',
                'user_data' => $userData,
                'custom_data' => [
                    'content_name' => 'AccountCreated',
                ],
            ]],
        ];

        try {
            $resp = Http::timeout(5)->post(
                'https://graph.facebook.com/v21.0/' . self::PIXEL_ID . '/events?access_token=' . $token,
                $payload
            );
            if (!$resp->successful()) {
                Log::warning('[meta-capi] non-200', ['status' => $resp->status(), 'body' => $resp->body()]);
            }
        } catch (\Throwable $e) {
            Log::warning('[meta-capi] send failed', ['error' => $e->getMessage()]);
        }
    }
}
