<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\CreditApprovalMail;
use App\Models\Chat;
use App\Models\Tag;
use App\Models\User;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    private function normalizeEmail(?string $email): string
    {
        $value = (string) $email;
        $value = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}\x{2060}]/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', '', $value) ?? $value;

        return mb_strtolower(trim($value));
    }

    /**
     * Build tolerant password candidates to reduce cross-device keyboard artifacts
     * (trailing spaces, NBSP, zero-width chars) without logging sensitive data.
     *
     * @return array<int, string>
     */
    private function passwordCandidates(?string $password): array
    {
        $raw = (string) $password;
        $spaceNormalized = str_replace("\xC2\xA0", ' ', $raw);
        $spaceNormalized = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}\x{2060}]/u', '', $spaceNormalized) ?? $spaceNormalized;

        $candidates = [
            $raw,
            $spaceNormalized,
            trim($raw),
            trim($spaceNormalized),
        ];

        $unique = [];
        foreach ($candidates as $candidate) {
            if (!in_array($candidate, $unique, true)) {
                $unique[] = $candidate;
            }
        }

        return $unique;
    }
    public function register(Request $request)
    {
        $normalizedEmail = $this->normalizeEmail((string) $request->input('email'));
        $request->merge(['email' => $normalizedEmail]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'surname' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'requested_amount' => 'nullable|numeric|min:0',
            'document_type' => 'nullable|string|max:50',
            'document_number' => 'nullable|string|max:100',
            'loan_term_months' => 'nullable|integer|min:1|max:600',
            'loan_term' => 'nullable|integer|min:1|max:600',
            'credit_term_months' => 'nullable|integer|min:1|max:600',
            'credit_term' => 'nullable|integer|min:1|max:600',
            'term_months' => 'nullable|integer|min:1|max:600',
            'term' => 'nullable|integer|min:1|max:600',
            'requested_term_months' => 'nullable|integer|min:1|max:600',
            'requested_term' => 'nullable|integer|min:1|max:600',
            'wizard_progress' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $wizardProgress = $this->buildWizardProgressFromRequest($request);

        $user = User::create([
            'name' => $request->name,
            'email' => $normalizedEmail,
            'surname' => $request->surname,
            'phone' => $request->phone,
            'requested_amount' => $request->requested_amount,
            'document_type' => $request->document_type,
            'document_number' => $request->document_number,
            'wizard_progress' => empty($wizardProgress) ? null : json_encode($wizardProgress, JSON_UNESCAPED_UNICODE),
            'password' => Hash::make($request->password),
            'commission_level_id' => 1,
        ]);

        /* Meta CAPI: честная регистрация (аккаунт реально создан в БД). */
        \App\Support\MetaConversionsApi::sendCompleteRegistration(
            (string) $user->email,
            $request->ip(),
            (string) $request->userAgent(),
            $request->cookie('_fbp'),
            $request->cookie('_fbc'),
        );

        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        // Create chat for new user
        $chat = Chat::create([
            'user_id' => $user->id,
            'manager_id' => $assignedManagerId,
            'status' => 'active',
        ]);

        $this->attachDefaultFdTag($chat);

        // Create welcome messages from manager (must match cabinet welcome)
        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $assignedManagerId ?: 1,
            'message' => 'Salve. Mi chiamo Deborah, sarò la sua consulente personale dedicata.',
            'is_read' => false,
        ]);

        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $assignedManagerId ?: 1,
            'message' => 'Se avrà domande, non esiti a scrivermi.',
            'is_read' => false,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        try {
            $firstName = trim((string) ($user->name ?? ''));
            $lastName = trim((string) ($user->surname ?? ''));

            $fullName = trim((string) ($firstName.' '.$lastName));
            if ($fullName === '') {
                $fullName = 'Cliente Velora';
            }

            $approvedAmount = $this->resolveApprovedAmountEuros($request, $user);
            Mail::to($user->email)->queue(new CreditApprovalMail(
                firstName: $firstName,
                lastName: $lastName,
                fullName: $fullName,
                amountFormatted: $this->formatAmountEuros($approvedAmount),
                amountEuros: $approvedAmount,
            ));
        } catch (\Throwable $e) {
            Log::warning('Credit approval email enqueue failed on register', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $normalizedEmail = $this->normalizeEmail((string) $request->input('email'));
        $request->merge(['email' => $normalizedEmail]);

        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        $rawPassword = (string) $request->input('password');
        $passwordOk = false;

        if ($user) {
            foreach ($this->passwordCandidates($rawPassword) as $candidate) {
                if (Hash::check($candidate, (string) $user->password)) {
                    $passwordOk = true;
                    break;
                }
            }
        }

        if (!$user || !$passwordOk) {
            Log::warning('Auth login failed', [
                'email' => $normalizedEmail,
                'user_found' => (bool) $user,
                'candidates_count' => count($this->passwordCandidates($rawPassword)),
                'ip' => $request->ip(),
                'ua' => mb_substr((string) ($request->userAgent() ?? ''), 0, 180),
            ]);

            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$user->commission_level_id) {
            $user->commission_level_id = 1;
            $user->save();
        }

        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        if ($assignedManagerId) {
            $chat = Chat::firstOrCreate(
                ['user_id' => $user->id],
                ['status' => 'active', 'manager_id' => $assignedManagerId]
            );

            if (!$chat->manager_id) {
                $chat->manager_id = $assignedManagerId;
                $chat->save();
            }

            $this->attachDefaultFdTag($chat);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function sendEmailChangeCode(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!empty($user->email_changed_at)) {
            return response()->json([
                'message' => 'Email already changed',
                'errors' => ['email' => ['L\'indirizzo email è già stato modificato una volta.']],
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $newEmail = mb_strtolower(trim($request->input('email')));

        if ($newEmail === mb_strtolower((string) $user->email)) {
            return response()->json([
                'errors' => ['email' => ['Il nuovo indirizzo coincide con quello attuale.']],
            ], 422);
        }

        if (\App\Models\User::where('email', $newEmail)->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'errors' => ['email' => ['Questo indirizzo email è già in uso.']],
            ], 422);
        }

        $cooldownKey = 'email_change:cooldown:'.$user->id;
        if (Cache::has($cooldownKey)) {
            return response()->json([
                'message' => 'Too many requests',
                'retry_after' => 60,
            ], 429);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $ttlSeconds = 15 * 60;

        Cache::put('email_change:code:'.$user->id, [
            'hash' => Hash::make($code),
            'email' => $newEmail,
            'attempts' => 0,
        ], now()->addSeconds($ttlSeconds));
        Cache::put($cooldownKey, 60, now()->addSeconds(60));

        try {
            Mail::raw(
                "Codice di conferma per il cambio email Velora: {$code}\n\nQuesto codice è valido per 15 minuti.\nSe non hai richiesto tu il cambio, ignora questa email.",
                function ($message) use ($newEmail) {
                    $message
                        ->to($newEmail)
                        ->subject('Velora — conferma cambio email');
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Email change code send failed', [
                'user_id' => $user->id,
                'email' => $newEmail,
                'error' => $e->getMessage(),
            ]);

            Cache::forget('email_change:code:'.$user->id);

            return response()->json(['message' => 'Unable to send verification code'], 500);
        }

        return response()->json(['ok' => true, 'ttl_seconds' => $ttlSeconds]);
    }

    /**
     * Смена пароля залогиненным клиентом.
     * Раньше «Cambia password» жила только в localStorage фронта —
     * сервер не знал о новом пароле и вход по нему был невозможен.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $currentOk = false;
        foreach ($this->passwordCandidates((string) $request->input('current_password')) as $candidate) {
            if (Hash::check($candidate, (string) $user->password)) {
                $currentOk = true;
                break;
            }
        }

        if (!$currentOk) {
            return response()->json([
                'errors' => ['current_password' => ['La password attuale non è corretta.']],
            ], 422);
        }

        $user->password = Hash::make((string) $request->input('password'));
        $user->save();

        return response()->json(['ok' => true]);
    }

    public function confirmEmailChange(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!empty($user->email_changed_at)) {
            return response()->json([
                'errors' => ['email' => ['L\'indirizzo email è già stato modificato una volta.']],
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $key = 'email_change:code:'.$user->id;
        $payload = Cache::get($key);

        if (!$payload) {
            return response()->json([
                'errors' => ['code' => ['Codice scaduto. Richiedi un nuovo codice.']],
            ], 422);
        }

        if (($payload['attempts'] ?? 0) >= 5) {
            Cache::forget($key);
            return response()->json([
                'errors' => ['code' => ['Troppi tentativi. Richiedi un nuovo codice.']],
            ], 422);
        }

        if (!Hash::check($request->input('code'), $payload['hash'])) {
            $payload['attempts'] = ($payload['attempts'] ?? 0) + 1;
            Cache::put($key, $payload, now()->addMinutes(15));
            return response()->json([
                'errors' => ['code' => ['Codice non valido.']],
            ], 422);
        }

        $user->email = $payload['email'];
        $user->email_verified_at = now();
        $user->email_changed_at = now();
        $user->save();

        Cache::forget($key);

        return response()->json([
            'ok' => true,
            'email' => $user->email,
            'email_changed_at' => $user->email_changed_at?->toIso8601String(),
        ]);
    }

    public function sendEmailVerificationCode(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!empty($user->email_verified_at)) {
            return response()->json([
                'ok' => true,
                'already_verified' => true,
            ]);
        }

        $cooldownKey = 'email_verify:cooldown:'.$user->id;
        if (Cache::has($cooldownKey)) {
            $retryAfter = (int) Cache::get($cooldownKey, 0);
            if ($retryAfter <= 0) {
                $retryAfter = 60;
            }

            return response()->json([
                'message' => 'Too many requests',
                'errors' => [
                    'code' => ['Please wait before requesting another code.'],
                ],
                'retry_after' => $retryAfter,
            ], 429);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $ttlSeconds = 15 * 60;
        $payload = [
            'hash' => Hash::make($code),
            'attempts' => 0,
            'created_at' => now()->toIso8601String(),
        ];

        Cache::put('email_verify:code:'.$user->id, $payload, now()->addSeconds($ttlSeconds));
        Cache::put($cooldownKey, 60, now()->addSeconds(60));

        try {
            Mail::raw(
                "Codice di verifica Velora: {$code}\n\nQuesto codice è valido per 15 minuti.\nSe non hai richiesto tu la verifica, ignora questa email.",
                function ($message) use ($user) {
                    $message
                        ->to($user->email)
                        ->subject('Velora — codice di verifica email');
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Email verification code send failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            Cache::forget('email_verify:code:'.$user->id);

            return response()->json([
                'message' => 'Unable to send verification code',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'ttl_seconds' => $ttlSeconds,
            'already_verified' => false,
        ]);
    }

    public function verifyEmailVerificationCode(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!empty($user->email_verified_at)) {
            return response()->json([
                'ok' => true,
                'already_verified' => true,
                'verified_at' => optional($user->email_verified_at)->toIso8601String(),
            ]);
        }

        $cacheKey = 'email_verify:code:'.$user->id;
        $cached = Cache::get($cacheKey);

        if (!is_array($cached) || empty($cached['hash'])) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => [
                    'code' => ['Code is invalid or expired.'],
                ],
            ], 422);
        }

        $attempts = (int) ($cached['attempts'] ?? 0);
        if ($attempts >= 5) {
            Cache::forget($cacheKey);

            return response()->json([
                'message' => 'Validation error',
                'errors' => [
                    'code' => ['Too many attempts. Request a new code.'],
                ],
            ], 422);
        }

        $code = trim((string) $request->input('code', ''));

        if (!Hash::check($code, (string) $cached['hash'])) {
            $cached['attempts'] = $attempts + 1;
            Cache::put($cacheKey, $cached, now()->addSeconds(15 * 60));

            return response()->json([
                'message' => 'Validation error',
                'errors' => [
                    'code' => ['Incorrect verification code.'],
                ],
            ], 422);
        }

        $user->email_verified_at = now();
        $user->save();

        Cache::forget($cacheKey);
        Cache::forget('email_verify:cooldown:'.$user->id);

        return response()->json([
            'ok' => true,
            'already_verified' => false,
            'verified_at' => optional($user->email_verified_at)->toIso8601String(),
        ]);
    }

    private function buildWizardProgressFromRequest(Request $request): array
    {
        $progress = [];

        $rawProgress = $request->input('wizard_progress');
        if (is_array($rawProgress)) {
            $progress = $rawProgress;
        } elseif (is_string($rawProgress) && trim($rawProgress) !== '') {
            $decoded = json_decode($rawProgress, true);
            if (is_array($decoded)) {
                $progress = $decoded;
            }
        }

        $termMonths = $this->extractLoanTermMonths($request);
        if ($termMonths !== null) {
            $progress['loan_term_months'] = $termMonths;
            $progress['term_months'] = $termMonths;
            $progress['term'] = $termMonths;

            $credit = isset($progress['credit']) && is_array($progress['credit'])
                ? $progress['credit']
                : [];
            $credit['term_months'] = $termMonths;
            $progress['credit'] = $credit;
        }

        return $progress;
    }

    private function extractLoanTermMonths(Request $request): ?int
    {
        $termKeys = [
            'loan_term_months',
            'loan_term',
            'credit_term_months',
            'credit_term',
            'term_months',
            'term',
            'requested_term_months',
            'requested_term',
        ];

        foreach ($termKeys as $key) {
            $value = (int) $request->input($key, 0);
            if ($value > 0) {
                return $value;
            }
        }

        return null;
    }


    private function resolveApprovedAmountEuros(Request $request, User $user): float
    {
        $requested = 0.0;

        $fromRequest = (float) $request->input('requested_amount', 0);
        if ($fromRequest > 0) {
            $requested = $fromRequest;
        }

        if ($requested <= 0) {
            $fromUser = (float) ($user->requested_amount ?? 0);
            if ($fromUser > 0) {
                $requested = $fromUser;
            }
        }

        if ($requested <= 0) {
            $wizard = $user->wizard_progress;
            $payload = null;

            if (is_array($wizard)) {
                $payload = $wizard;
            } elseif (is_string($wizard) && trim($wizard) !== '') {
                $decoded = json_decode($wizard, true);
                if (is_array($decoded)) {
                    $payload = $decoded;
                }
            }

            if (is_array($payload)) {
                $candidates = [
                    $payload['requested_amount'] ?? null,
                    $payload['amount'] ?? null,
                    $payload['credit']['amount'] ?? null,
                    $payload['credit']['requested_amount'] ?? null,
                ];

                foreach ($candidates as $raw) {
                    $value = (float) ($raw ?? 0);
                    if ($value > 0) {
                        $requested = $value;
                        break;
                    }
                }
            }
        }

        return $this->approvedFromRequested($requested);
    }

    /**
     * Та же формула, что и на фронте (offer-terms.ts: approvedFromRequested):
     * одобрено меньше запрошенного на 15..20%, детерминированно, округление вниз до 100€.
     */
    private function approvedFromRequested(float $requested): float
    {
        if ($requested <= 0) {
            return 0.0;
        }

        $cutMin = 0.15;
        $cutMax = 0.20;
        $steps = (int) round($cutMax * 100 - $cutMin * 100) + 1;
        $cut = $cutMin + (abs((int) round($requested / 500)) % $steps) / 100;

        $reduced = $requested * (1 - $cut);

        return floor($reduced / 100) * 100;
    }

    private function formatAmountEuros(float $amount): string
    {
        return number_format(max(0, $amount), 2, ',', '.').' €';
    }

    private function attachDefaultFdTag(Chat $chat): void
    {
        $fdTag = Tag::query()
            ->whereRaw('LOWER(name) = ?', ['fd'])
            ->first();

        if (!$fdTag) {
            return;
        }

        $chat->tags()->syncWithoutDetaching([$fdTag->id]);
    }
}
