<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Users\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Приём документов из клиентского кабинета.
 * POST /api/users/documents/upload (auth:sanctum, multipart: file, type)
 * type: passport|license|contract|proof_of_address
 */
class UserDocumentController extends Controller
{
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'file' => [
                'required', 'file', 'max:20480', // 20 MB, синхронно с фронтом
                'mimes:jpg,jpeg,png,gif,webp,heic,heif,bmp,pdf',
            ],
            'type' => ['required', 'in:passport,license,contract,proof_of_address'],
        ]);

        $user = $request->user();
        $file = $validated['file'];
        $type = $validated['type'];

        $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $fileName = Str::random(32) . '.' . $ext;
        $path = 'documents/' . $user->id . '/' . $type . '/' . $fileName;

        Storage::disk('public')->put($path, file_get_contents($file->getRealPath()));

        $document = Document::create([
            'user_id' => $user->id,
            'type' => $type,
            'filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'path' => $path,
            'size' => $file->getSize(),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Document uploaded',
            'data' => [
                'id' => $document->id,
                'filename' => $document->filename,
                'mime_type' => $document->mime_type,
                'path' => $document->path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }
}
