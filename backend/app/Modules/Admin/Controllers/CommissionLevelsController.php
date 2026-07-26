<?php

namespace App\Modules\Admin\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class CommissionLevelsController extends Controller
{
    public function index(): JsonResponse
    {
        $levels = DB::table('commission_levels')
            ->orderBy('order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $levels
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'levels' => 'required|array',
            'levels.*.id' => 'nullable|integer',
            'levels.*.name' => 'required|string|max:255',
            'levels.*.amount' => 'required|numeric|min:0',
            'levels.*.order' => 'required|integer|min:1',
            'levels.*.description' => 'nullable|string|max:1000'
        ]);

        DB::transaction(function () use ($validated) {
            // Удаляем все старые уровни
            DB::table('commission_levels')->delete();

            // Вставляем новые
            foreach ($validated['levels'] as $level) {
                DB::table('commission_levels')->insert([
                    'name' => $level['name'],
                    'amount' => $level['amount'],
                    'order' => $level['order'],
                    'description' => $level['description'] ?? '',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Уровни комиссий сохранены'
        ]);
    }
}
