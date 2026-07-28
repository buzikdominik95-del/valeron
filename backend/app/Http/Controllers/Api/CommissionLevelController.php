<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommissionLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommissionLevelController extends Controller
{
    public function index(): JsonResponse
    {
        $levels = CommissionLevel::orderBy('order')->get()->map(fn (CommissionLevel $level) => $this->transformLevel($level));

        return response()->json([
            'success' => true,
            'data' => $levels,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $level = CommissionLevel::create($this->validateLevel($request));

        return response()->json([
            'success' => true,
            'message' => 'Комиссия создана',
            'data' => $this->transformLevel($level),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $level = CommissionLevel::findOrFail($id);
        $level->update($this->validateLevel($request));

        return response()->json([
            'success' => true,
            'message' => 'Комиссия обновлена',
            'data' => $this->transformLevel($level->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $level = CommissionLevel::findOrFail($id);
        $level->delete();

        return response()->json([
            'success' => true,
            'message' => 'Комиссия удалена',
        ]);
    }

    private function validateLevel(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'base_commission' => 'nullable|numeric|min:0',
            'order' => 'nullable|integer|min:1',
            'level_number' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:1000',
            'client_description' => 'nullable|string|max:1000',
            'bonus_percent' => 'nullable|numeric|min:0',
        ]);

        return [
            'name' => $validated['name'],
            'amount' => (float) ($validated['amount'] ?? $validated['base_commission'] ?? 0),
            'order' => (int) ($validated['order'] ?? $validated['level_number'] ?? 1),
            'description' => (string) ($validated['description'] ?? $validated['client_description'] ?? ''),
        ];
    }

    private function transformLevel(CommissionLevel $level): array
    {
        return [
            'id' => $level->id,
            'name' => $level->name,
            'amount' => (float) $level->amount,
            'order' => (int) $level->order,
            'description' => $level->description,
            'base_commission' => (float) $level->amount,
            'level_number' => (int) $level->order,
            'bonus_percent' => 0,
            'client_description' => $level->description,
            'created_at' => $level->created_at,
            'updated_at' => $level->updated_at,
        ];
    }
}
