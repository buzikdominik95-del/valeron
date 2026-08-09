<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailDeliveryEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ResendWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        if (! $this->isAuthorized($request)) {
            return response()->json(['ok' => false, 'message' => 'Unauthorized'], 401);
        }

        $payload = $request->json()->all();
        if (! is_array($payload)) {
            return response()->json(['ok' => false, 'message' => 'Invalid payload'], 422);
        }

        if ($payload === []) {
            return response()->json(['ok' => false, 'message' => 'Invalid payload'], 422);
        }

        $events = $this->normalizeEvents($payload);
        if ($events === []) {
            return response()->json(['ok' => false, 'message' => 'No events found'], 422);
        }

        $stored = 0;
        foreach ($events as $event) {
            $eventType = (string) ($event['type'] ?? 'unknown');
            $record = [
                'provider' => 'resend',
                'provider_event_id' => $this->stringOrNull($event['id'] ?? null),
                'message_id' => $this->extractMessageId($event),
                'event_type' => $eventType,
                'status' => $this->deriveStatus($eventType),
                'recipient' => $this->extractRecipient($event),
                'subject' => $this->extractSubject($event),
                'occurred_at' => $this->parseOccurredAt($event['created_at'] ?? $event['data']['created_at'] ?? null),
                'payload' => $event,
            ];

            if (! empty($record['provider_event_id'])) {
                EmailDeliveryEvent::query()->updateOrCreate(
                    [
                        'provider' => 'resend',
                        'provider_event_id' => $record['provider_event_id'],
                    ],
                    $record
                );
            } else {
                EmailDeliveryEvent::query()->create($record);
            }

            $stored++;
        }

        return response()->json(['ok' => true, 'stored' => $stored]);
    }

    private function isAuthorized(Request $request): bool
    {
        $bearer = (string) config('services.resend.webhook_bearer', '');
        if ($bearer !== '') {
            if ((string) $request->bearerToken() !== $bearer) {
                return false;
            }
        }

        $secret = (string) config('services.resend.webhook_secret', '');
        if ($secret !== '') {
            $header = (string) $request->header('X-Resend-Signature', '');
            if ($header === '') {
                return false;
            }

            $raw = (string) $request->getContent();
            $expected = hash_hmac('sha256', $raw, $secret);
            $normalized = str_starts_with($header, 'sha256=') ? substr($header, 7) : $header;

            if (! hash_equals($expected, $normalized)) {
                return false;
            }
        }

        return true;
    }

    private function normalizeEvents(array $payload): array
    {
        if (isset($payload[0])) {
            if (is_array($payload[0])) {
                return $payload;
            }
        }

        if (isset($payload['events'])) {
            if (is_array($payload['events'])) {
                return array_values(array_filter($payload['events'], 'is_array'));
            }
        }

        if (isset($payload['type'])) {
            if (is_string($payload['type'])) {
                return [$payload];
            }
        }

        if (isset($payload['event'])) {
            if (is_array($payload['event'])) {
                return [$payload['event']];
            }
        }

        return [];
    }

    private function extractMessageId(array $event): ?string
    {
        $candidates = [
            $event['data']['email_id'] ?? null,
            $event['data']['id'] ?? null,
            $event['email_id'] ?? null,
            $event['message_id'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            $value = $this->stringOrNull($candidate);
            if ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    private function extractSubject(array $event): ?string
    {
        $subject = $event['data']['subject'] ?? null;
        if ($subject === null) {
            $subject = $event['subject'] ?? null;
        }

        return $this->stringOrNull($subject);
    }

    private function extractRecipient(array $event): ?string
    {
        $to = $event['data']['to'] ?? $event['to'] ?? null;

        if (is_string($to)) {
            $s = trim($to);
            if ($s !== '') {
                return $s;
            }
        }

        if (is_array($to)) {
            if (isset($to[0])) {
                return $this->stringOrNull($to[0]);
            }
        }

        return null;
    }

    private function deriveStatus(string $eventType): string
    {
        $type = strtolower($eventType);

        if (str_contains($type, 'delivered')) {
            return 'delivered';
        }

        if (str_contains($type, 'bounced')) {
            return 'bounced';
        }

        if (str_contains($type, 'bounce')) {
            return 'bounced';
        }

        if (str_contains($type, 'complained')) {
            return 'complained';
        }

        if (str_contains($type, 'complaint')) {
            return 'complained';
        }

        if (str_contains($type, 'clicked')) {
            return 'clicked';
        }

        if (str_contains($type, 'opened')) {
            return 'opened';
        }

        return 'unknown';
    }

    private function parseOccurredAt(mixed $value): ?Carbon
    {
        if (! is_string($value)) {
            return null;
        }

        if (trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function stringOrNull(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        return $s;
    }
}
