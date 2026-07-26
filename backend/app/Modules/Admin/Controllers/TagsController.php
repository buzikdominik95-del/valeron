<?php

namespace App\Modules\Admin\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class TagsController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = DB::table('tags')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tags
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'required|string|max:7'
        ]);

        $id = DB::table('tags')->insertGetId([
            'name' => $validated['name'],
            'color' => $validated['color'],
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $id,
                ...$validated
            ]
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        DB::table('tags')->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Тег удален'
        ]);
    }
}
