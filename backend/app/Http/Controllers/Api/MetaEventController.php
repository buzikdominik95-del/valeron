<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MetaConversionsApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;

class MetaEventController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'event_name' => 'required|string|in:ViewContent,AddToCart,InitiateCheckout,CompleteRegistration',
            'event_key' => 'required|string|max:120',
            'event_source_url' => 'nullable|string|max:2048',
            'email' => 'nullable|string|email|max:255',
            'custom_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $eventName = (string) $request->input('event_name');

        // Harden public endpoint against spam/flood while keeping legitimate funnel events.
        if (!preg_match('/^loan_step_[1-4]$/', $eventKey)) {
            return response()->json(['ok' => false, 'message' => 'Unsupported event key'], 422);
        }

        $rateBucket = sprintf('meta_events:%s:%s', $request->ip(), $eventKey);
        if (RateLimiter::tooManyAttempts($rateBucket, 30)) {
            return response()->json(['ok' => false, 'message' => 'Too many requests'], 429);
        }
        RateLimiter::hit($rateBucket, 60);

        $eventKey = (string) $request->input('event_key');
        $email = $request->input('email');

        $clientFingerprint = (string) ($request->cookie('_fbp')
            ?: $request->cookie('_fbc')
            ?: $request->input('visitor_key')
            ?: ($request->ip().'|'.$request->userAgent()));

        $normalizedKey = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $eventKey) ?: 'event';
        $eventId = strtolower($eventName).'_'.$normalizedKey.'_'.substr(hash('sha256', $clientFingerprint), 0, 16);

        $customData = $request->input('custom_data');
        if (!is_array($customData)) {
            $customData = [];
        }

        $result = MetaConversionsApi::sendPublicFunnelEvent(
            eventName: $eventName,
            eventId: $eventId,
            email: is_string($email) ? $email : null,
            clientIp: $request->ip(),
            userAgent: (string) $request->userAgent(),
            fbp: $request->cookie('_fbp'),
            fbc: $request->cookie('_fbc'),
            customData: $customData,
            eventSourceUrl: (string) ($request->input('event_source_url') ?: ''),
        );

        return response()->json([
            'ok' => (bool) ($result['ok'] ?? false),
            'event_id' => $eventId,
            'status' => $result['status'] ?? null,
        ]);
    }
}
