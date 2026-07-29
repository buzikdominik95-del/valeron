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
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'surname' => $request->surname,
            'phone' => $request->phone,
            'requested_amount' => $request->requested_amount,
            'document_type' => $request->document_type,
            'document_number' => $request->document_number,
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

            if ($chat->wasRecentlyCreated) {
                $this->attachDefaultFdTag($chat);
            }
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
