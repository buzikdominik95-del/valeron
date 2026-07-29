<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Tag;
use App\Models\User;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request)
    {
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
            'email' => $request->email,
            'surname' => $request->surname,
            'phone' => $request->phone,
            'requested_amount' => $request->requested_amount,
            'document_type' => $request->document_type,
            'document_number' => $request->document_number,
            'wizard_progress' => empty($wizardProgress) ? null : json_encode($wizardProgress, JSON_UNESCAPED_UNICODE),
            'password' => Hash::make($request->password),
            'commission_level_id' => 1,
        ]);

        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        // Create chat for new user
        $chat = Chat::create([
            'user_id' => $user->id,
            'manager_id' => $assignedManagerId,
            'status' => 'active',
        ]);

        $this->attachDefaultFdTag($chat);

        // Create welcome message from manager
        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $assignedManagerId ?: 1,
            'message' => 'Buongiorno! Scriva pure la sua domanda sulla pratica: le rispondiamo nei giorni lavorativi.',
            'is_read' => false,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
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
