<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
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
                ['name' => $name, 'password' => bcrypt(\Illuminate\Support\Str::random(32))]
            );
        } else {
            $user = Auth::user();

            // Fallback для старых/анонимных запросов без email.
            if (!$user) {
                $user = User::firstOrCreate(
                    ['email' => 'anonymous@it-velora.com'],
                    ['name' => 'Anonymous', 'password' => bcrypt(\Illuminate\Support\Str::random(32))]
                );
            }
        }
        
        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

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

        return response()->json(['messages' => $messages]);
    }

    public function getAccount(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Split name into first and last name
        $nameParts = explode(' ', $user->name, 2);
        $firstName = $nameParts[0] ?? '';
        $lastName = $nameParts[1] ?? '';

        // Return the account dossier format expected by frontend
        return response()->json([
            'client' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $user->email,
            ],
            'credit' => [
                'approvedAmountCents' => 500000, // 5000 EUR default
                'ratePercent' => 7.5,
            ],
            'policy' => [
                'termsAcceptedAt' => $user->created_at->toIso8601String(),
                'privacyAcceptedAt' => $user->created_at->toIso8601String(),
            ],
            'transfer' => [
                'iban' => 'IT00X0000000000000000000000',
                'beneficiaryName' => $user->name,
                'bankName' => 'Velora Bank',
            ],
            'commission' => [
                'levelId' => 1,
                'ratePercent' => 2.5,
                'earnedCents' => 0,
            ],
            'steps' => [
                'registration' => true,
                'questionnaire' => false,
                'identity' => false,
                'contract' => false,
                'transfer' => false,
            ],
            'documents' => [],
        ]);
    }
}
