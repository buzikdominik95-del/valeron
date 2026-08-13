<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta Conversions API (server-side only).
 * Все события шлём только с бэкенда.
 */
class MetaConversionsApi
{
    private const PIXEL_ID = '1013720174870447';

    /**
     * Детеминированный Lead по правилу: event_id = lead_<lead_id>.
     */
    public static function sendLeadByLeadId(
        int $leadId,
        ?string $email,
        ?string $clientIp,
        ?string $userAgent,
        ?string $fbp = null,
        ?string $fbc = null,
    ): array {
        $eventId = 'lead_'.$leadId;

        return self::sendEvent(
            leadId: $leadId,
            eventName: 'Lead',
            eventId: $eventId,
            email: $email,
            clientIp: $clientIp,
            userAgent: $userAgent,
            fbp: $fbp,
            fbc: $fbc,
            customData: [
                'content_name' => 'AccountCreated',
                'lead_type' => 'registration',
            ],
            eventSourceUrl: 'https://velorafinanza.com/',
        );
    }

    public static function sendPublicFunnelEvent(
        string $eventName,
        string $eventId,
        ?string $email,
        ?string $clientIp,
        ?string $userAgent,
        ?string $fbp = null,
        ?string $fbc = null,
        array $customData = [],
        ?string $eventSourceUrl = null,
    ): array {
        return self::sendEvent(
            leadId: null,
            eventName: $eventName,
            eventId: $eventId,
            email: $email,
            clientIp: $clientIp,
            userAgent: $userAgent,
            fbp: $fbp,
            fbc: $fbc,
            customData: $customData,
            eventSourceUrl: $eventSourceUrl,
        );
    }

    private static function sendEvent(
        ?int $leadId,
        string $eventName,
        string $eventId,
        ?string $email,
        ?string $clientIp,
        ?string $userAgent,
        ?string $fbp,
        ?string $fbc,
        array $customData,
        ?string $eventSourceUrl,
    ): array {
        $token = trim((string) env('META_CAPI_TOKEN', ''));

        self::touchEventRow(
            leadId: $leadId,
            eventName: $eventName,
            eventId: $eventId,
        );

        if ($token === '') {
            self::saveMetaResult(
                eventId: $eventId,
                status: 'skipped_no_token',
                httpStatus: null,
                response: ['message' => 'META_CAPI_TOKEN is empty'],
            );

            return [
                'ok' => false,
                'event_id' => $eventId,
                'status' => 'skipped_no_token',
            ];
        }

        $userData = [];
        $cleanEmail = is_string($email) ? trim(mb_strtolower($email)) : '';
        if ($cleanEmail !== '') {
            $userData['em'] = [hash('sha256', $cleanEmail)];
        }
        if (!empty($clientIp)) {
            $userData['client_ip_address'] = $clientIp;
        }
        if (!empty($userAgent)) {
            $userData['client_user_agent'] = $userAgent;
        }
        if (!empty($fbp)) {
            $userData['fbp'] = $fbp;
        }
        if (!empty($fbc)) {
            $userData['fbc'] = $fbc;
        }

        $payload = [
            'data' => [[
                'event_name' => $eventName,
                'event_time' => time(),
                'event_id' => $eventId,
                'action_source' => 'website',
                'event_source_url' => $eventSourceUrl ?: 'https://velorafinanza.com/',
                'user_data' => $userData,
                'custom_data' => $customData,
            ]],
        ];

        try {
            $resp = Http::timeout(6)->post(
                'https://graph.facebook.com/v21.0/'.self::PIXEL_ID.'/events?access_token='.$token,
                $payload
            );

            $responsePayload = [
                'ok' => $resp->successful(),
                'status' => $resp->status(),
                'body' => self::safeDecodeBody($resp->body()),
                'payload' => $payload,
            ];

            self::saveMetaResult(
                eventId: $eventId,
                status: $resp->successful() ? 'sent' : 'failed',
                httpStatus: $resp->status(),
                response: $responsePayload,
            );

            if (!$resp->successful()) {
                Log::warning('[meta-capi] non-200', [
                    'event_name' => $eventName,
                    'event_id' => $eventId,
                    'status' => $resp->status(),
                    'body' => $resp->body(),
                ]);
            }

            return [
                'ok' => $resp->successful(),
                'event_id' => $eventId,
                'status' => $resp->status(),
            ];
        } catch (\Throwable $e) {
            self::saveMetaResult(
                eventId: $eventId,
                status: 'failed',
                httpStatus: null,
                response: [
                    'ok' => false,
                    'error' => $e->getMessage(),
                    'payload' => $payload,
                ],
            );

            Log::warning('[meta-capi] send failed', [
                'event_name' => $eventName,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'event_id' => $eventId,
                'status' => 'failed',
            ];
        }
    }

    private static function touchEventRow(?int $leadId, string $eventName, string $eventId): void
    {
        $now = now();

        DB::table('meta_capi_events')->updateOrInsert(
            ['meta_event_id' => $eventId],
            [
                'lead_id' => $leadId,
                'event_name' => $eventName,
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );

        DB::table('meta_capi_events')
            ->where('meta_event_id', $eventId)
            ->increment('meta_attempts');
    }

    private static function saveMetaResult(
        string $eventId,
        string $status,
        ?int $httpStatus,
        array $response,
    ): void {
        DB::table('meta_capi_events')
            ->where('meta_event_id', $eventId)
            ->update([
                'meta_status' => $status,
                'meta_http_status' => $httpStatus,
                'meta_response' => $response,
                'meta_lead_sent_at' => now(),
                'updated_at' => now(),
            ]);
    }

    private static function safeDecodeBody(string $body): array|string
    {
        $decoded = json_decode($body, true);
        return is_array($decoded) ? $decoded : $body;
    }
}
