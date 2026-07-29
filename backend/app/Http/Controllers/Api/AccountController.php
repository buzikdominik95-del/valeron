<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\CommissionLevel;
use App\Models\IbanSetting;
use App\Models\Tag;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
            'kind' => 'nullable|string',
            'level' => 'nullable|integer',
            'email' => 'nullable|email',
            'name' => 'nullable|string',
        ]);

        // Важно: чат должен идти по email текущего клиента в UI,
        // иначе при живой auth-сессии другого пользователя сообщение может
        // сохраниться в "чужой" чат и затем исчезнуть после sync по email.
        $email = trim((string) $request->input('email', ''));

        if ($email !== '') {
            $name = trim((string) $request->input('name', ''));
            if ($name === '') {
                $name = 'Anonymous';
            }

            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => bcrypt(\Illuminate\Support\Str::random(32)), 'commission_level_id' => 1]
            );
        } else {
            $user = Auth::user();

            // Fallback для старых/анонимных запросов без email.
            if (!$user) {
                $user = User::firstOrCreate(
                    ['email' => 'anonymous@it-velora.com'],
                    ['name' => 'Anonymous', 'password' => bcrypt(\Illuminate\Support\Str::random(32)), 'commission_level_id' => 1]
                );
            }
        }
        
        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active', 'manager_id' => $assignedManagerId]
        );

        if ($assignedManagerId && !$chat->manager_id) {
            $chat->manager_id = $assignedManagerId;
            $chat->save();
        }

        $this->attachDefaultFdTag($chat);

        $message = $chat->messages()->create([
            'sender_type' => 'user',
            'sender_id' => $user->id,
            'message' => $request->body,
            'is_read' => false,
        ]);

        $chat->touch();

        return response()->json([
            'ok' => true,
            'message' => [
                'id' => $message->id,
                'text' => $message->message,
                'created_at' => $message->created_at,
            ],
        ]);
    }

    public function getMessages(Request $request)
    {
        // Для консистентности с sendMessage: если email пришёл, читаем именно его тред.
        $email = trim((string) $request->input('email', ''));

        if ($email !== '') {
            $user = User::where('email', $email)->first();
        } else {
            $user = Auth::user();
            if (!$user) {
                $user = User::where('email', 'anonymous@it-velora.com')->first();
            }
        }
        
        if (!$user) {
            return response()->json(['messages' => []]);
        }
        
        $chat = Chat::where('user_id', $user->id)->first();
        
        if (!$chat) {
            return response()->json(['messages' => []]);
        }

        $messages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'author' => $msg->sender_type === 'manager' ? 'agent' : 'client',
                    'text' => $msg->message,
                    'at' => $msg->created_at->toISOString(),
                    'delivery' => 'sent',
                ];
            });

        return response()
            ->json(['messages' => $messages])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function getAccount(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $nameParts = preg_split('/\s+/', trim((string) $user->name), 2);
        $firstName = $nameParts[0] ?? '';
        $lastName = trim((string) ($user->surname ?? ($nameParts[1] ?? '')));

        $leadProfile = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['credit_term_months', 'iban']);

        $leadIban = DB::table('ibans')
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (empty($leadIban) && !empty($leadProfile?->iban)) {
            $leadIban = (string) $leadProfile->iban;
        }

        $loanTermMonths = $this->extractLoanTermMonths($user->wizard_progress ?? null);
        if (($loanTermMonths ?? 0) <= 0 && !empty($leadProfile?->credit_term_months)) {
            $loanTermMonths = (int) $leadProfile->credit_term_months;
        }

        $level = (int) ($user->commission_level_id ?? 1);
        if ($level < 1) $level = 1;
        if ($level > 4) $level = 4;

        $phase = 'ready';
        if ($level === 3) {
            $phase = 'policy_build';
        }

        $fees = [
            1 => ['amountCents' => 3700, 'reason' => 'base'],
            2 => ['amountCents' => 17200, 'reason' => 'insurance'],
            3 => ['amountCents' => 13600, 'reason' => 'aml'],
            4 => ['amountCents' => 0, 'reason' => 'release'],
        ];

        $dbLevels = CommissionLevel::query()->get(['order', 'amount']);
        foreach ($dbLevels as $dbLevel) {
            $order = (int) ($dbLevel->order ?? 0);
            if (!array_key_exists($order, $fees)) {
                continue;
            }
            $fees[$order]['amountCents'] = (int) round(((float) $dbLevel->amount) * 100);
        }

        $fee = $fees[$level] ?? $fees[1];

        $ibanSettings = IbanSetting::query()->first();
        $beneficiary = trim((string) ($ibanSettings?->beneficiary_name ?? 'Velora Servizi S.r.l.'));
        if ($beneficiary === '') {
            $beneficiary = 'Velora Servizi S.r.l.';
        }

        $ibanRaw = strtoupper(preg_replace('/\s+/', '', (string) ($ibanSettings?->global_iban ?? 'IT09T0200809005000043094427')));
        if ($ibanRaw === '') {
            $ibanRaw = 'IT09T0200809005000043094427';
        }

        $swift = strtoupper(trim((string) ($ibanSettings?->bic_swift ?? 'UNCRITMMXXX')));
        if ($swift === '') {
            $swift = 'UNCRITMMXXX';
        }

        $paymentCoords = [
            'method' => 'sepa_instant',
            'beneficiary' => $beneficiary,
            'iban' => $ibanRaw,
            'swift' => $swift,
            'amountCents' => (int) $fee['amountCents'],
        ];

        $animations = [
            1 => 0,
            2 => 7 * 60 * 1000,
            3 => 0,
            4 => 3 * 60 * 1000,
        ];

        return response()->json([
            'client' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $user->email,
                'lead_iban' => $leadIban,
            ],
            'credit' => [
                'approvedAmountCents' => (int) round(((float) ($user->requested_amount ?? 0)) * 100),
                'ratePercent' => 3.8,
                'isNew' => false,
                'termMonths' => $loanTermMonths,
            ],
            'policy' => [
                'status' => $level >= 4 ? 'issued' : 'processing',
                'etaMinutes' => $level >= 4 ? 0 : 30,
            ],
            'transfer' => [
                'status' => 'idle',
                'etaMinutes' => 60,
                'method' => null,
                'accountTail' => '',
            ],
            'commission' => [
                'level' => $level,
                'phase' => $phase,
                'fee' => $fee,
                'animationMs' => $animations[$level],
                'animationStartedAt' => null,
                'policyProgress' => $level >= 4 ? 1 : ($level === 3 ? 0.05 : 0),
            ],
            'steps' => [
                ['id' => 'simulation', 'completed' => true],
                ['id' => 'approval', 'completed' => true],
                ['id' => 'account', 'completed' => true],
                ['id' => 'documents', 'completed' => true],
                ['id' => 'signature', 'completed' => true],
            ],
            'currentStep' => 'signature',
            'documents' => [
                ['kind' => 'identity', 'fileName' => '', 'uploadedAt' => null],
            ],
            'loan_term_months' => $loanTermMonths,
            'lead_iban' => $leadIban,
            'payment_coords' => $paymentCoords,
            'paymentCoords' => $paymentCoords,
        ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }


    public function saveIban(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'iban' => 'required|string|max:64',
            'bic' => 'nullable|string|max:32',
            'bank_name' => 'nullable|string|max:255',
            'account_holder' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
        ]);

        $iban = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) ($validated['iban'] ?? '')));
        if (strlen($iban) < 10) {
            return response()->json([
                'message' => 'IBAN non valido',
                'errors' => ['iban' => ['IBAN non valido']],
            ], 422);
        }

        $isDefault = array_key_exists('is_default', $validated)
            ? (bool) $validated['is_default']
            : true;

        $accountHolder = trim((string) ($validated['account_holder'] ?? ''));
        if ($accountHolder === '') {
            $accountHolder = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));
        }

        DB::transaction(function () use ($user, $validated, $iban, $isDefault, $accountHolder) {
            if ($isDefault) {
                DB::table('ibans')
                    ->where('user_id', $user->id)
                    ->update([
                        'is_default' => false,
                        'updated_at' => now(),
                    ]);
            }

            $existingId = DB::table('ibans')
                ->where('user_id', $user->id)
                ->whereRaw('UPPER(iban) = ?', [$iban])
                ->value('id');

            $payload = [
                'user_id' => $user->id,
                'iban' => $iban,
                'bic' => $validated['bic'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'account_holder' => $accountHolder !== '' ? $accountHolder : null,
                'status' => 'pending',
                'is_default' => $isDefault,
                'updated_at' => now(),
            ];

            if ($existingId) {
                DB::table('ibans')->where('id', $existingId)->update($payload);
            } else {
                $payload['created_at'] = now();
                DB::table('ibans')->insert($payload);
            }
        });

        DB::table('leads')
            ->where('user_id', $user->id)
            ->update([
                'iban' => $iban,
                'updated_at' => now(),
            ]);

        return response()->json([
            'ok' => true,
            'lead_iban' => $iban,
        ]);
    }

    public function saveWizardProgress(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'wizard_progress' => 'nullable',
            'loan_term_months' => 'nullable|integer|min:1|max:600',
            'loan_term' => 'nullable|integer|min:1|max:600',
            'credit_term_months' => 'nullable|integer|min:1|max:600',
            'credit_term' => 'nullable|integer|min:1|max:600',
            'term_months' => 'nullable|integer|min:1|max:600',
            'term' => 'nullable|integer|min:1|max:600',
            'requested_term_months' => 'nullable|integer|min:1|max:600',
            'requested_term' => 'nullable|integer|min:1|max:600',
        ]);

        $currentProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);

        $rawIncomingProgress = $validated['wizard_progress'] ?? null;
        if (is_array($rawIncomingProgress)) {
            $currentProgress = array_merge($currentProgress, $rawIncomingProgress);
        } elseif (is_string($rawIncomingProgress) && trim($rawIncomingProgress) !== '') {
            $decodedIncoming = json_decode($rawIncomingProgress, true);
            if (is_array($decodedIncoming)) {
                $currentProgress = array_merge($currentProgress, $decodedIncoming);
            }
        }

        $loanTermMonths = $this->extractLoanTermMonths($validated);
        if ($loanTermMonths !== null) {
            $currentProgress['loan_term_months'] = $loanTermMonths;
            $currentProgress['term_months'] = $loanTermMonths;
            $currentProgress['term'] = $loanTermMonths;

            $credit = isset($currentProgress['credit']) && is_array($currentProgress['credit'])
                ? $currentProgress['credit']
                : [];
            $credit['term_months'] = $loanTermMonths;
            $currentProgress['credit'] = $credit;
        }

        $user->wizard_progress = empty($currentProgress)
            ? null
            : json_encode($currentProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $resolvedTermMonths = $this->extractLoanTermMonths($currentProgress);

        if (($resolvedTermMonths ?? 0) > 0) {
            DB::table('leads')
                ->where('user_id', $user->id)
                ->update([
                    'credit_term_months' => $resolvedTermMonths,
                    'updated_at' => now(),
                ]);
        }

        return response()->json([
            'ok' => true,
            'loan_term_months' => $resolvedTermMonths,
        ]);
    }

    private function decodeWizardProgressData($rawData): array
    {
        if (is_array($rawData)) {
            return $rawData;
        }

        $decoded = json_decode((string) ($rawData ?? ''), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function extractLoanTermMonths($source): ?int
    {
        if (is_array($source)) {
            $data = $source;
        } else {
            $data = $this->decodeWizardProgressData($source);
        }

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
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $value = (int) $data[$key];
            if ($value > 0) {
                return $value;
            }
        }

        if (isset($data['credit']) && is_array($data['credit'])) {
            foreach (['term_months', 'term', 'loan_term'] as $nestedKey) {
                if (!array_key_exists($nestedKey, $data['credit'])) {
                    continue;
                }

                $value = (int) $data['credit'][$nestedKey];
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
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
