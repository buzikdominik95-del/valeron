<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Users\Services\DocumentService;
use App\Modules\Users\Requests\UploadDocumentRequest;
use App\Modules\Users\Resources\DocumentResource;
use Illuminate\Http\JsonResponse;

class DocumentController extends Controller
{
    public function __construct(private DocumentService $documentService) {}

    public function upload(UploadDocumentRequest $request): JsonResponse
    {
        $document = $this->documentService->upload(
            auth()->id(),
            $request->only(['file']),
            $request->input('type')
        );

        return response()->json([
            'message' => 'Document uploaded successfully',
            'data' => new DocumentResource($document)
        ], 201);
    }

    public function getByType(string $type): JsonResponse
    {
        $documents = $this->documentService->getByType(auth()->id(), $type);
        return response()->json([
            'data' => DocumentResource::collection(collect($documents))
        ]);
    }

    public function getAll(): JsonResponse
    {
        $documents = $this->documentService->getAllDocuments(auth()->id());
        return response()->json([
            'data' => DocumentResource::collection(collect($documents))
        ]);
    }

    public function delete(int $documentId): JsonResponse
    {
        $this->documentService->delete($documentId);
        return response()->json(['message' => 'Document deleted successfully']);
    }
}
