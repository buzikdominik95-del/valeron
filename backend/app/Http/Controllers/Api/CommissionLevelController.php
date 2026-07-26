<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommissionLevel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CommissionLevelController extends Controller
{
    public function index(): JsonResponse
    {
        $levels = CommissionLevel::orderBy('order')->get();
        
        return response()->json([
            'success' => true,
            'data' => $levels
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'levels' => 'required|array',
            'levels.*.id' => 'nullable|integer|exists:commission_levels,id',
            'levels.*.name' => 'required|string|max:255',
            'levels.*.amount' => 'required|numeric|min:0',
            'levels.*.order' => 'required|integer|min:1',
            'levels.*.description' => 'nullable|string|max:1000'
        ]);

        CommissionLevel::truncate();

        $savedLevels = [];
        foreach ($validated['levels'] as $levelData) {
            unset($levelData['id']);
            $savedLevels[] = CommissionLevel::create($levelData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Уровни комиссий сохранены',
            'data' => $savedLevels
        ]);
    }
}
