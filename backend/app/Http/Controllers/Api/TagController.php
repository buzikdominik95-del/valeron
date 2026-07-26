<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = Tag::orderBy('name')->get();
        
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

        $tag = Tag::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Тег создан',
            'data' => $tag
        ], 201);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $tag->delete();

        return response()->json([
            'success' => true,
            'message' => 'Тег удален'
        ]);
    }
}
