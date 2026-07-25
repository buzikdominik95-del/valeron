<?php

namespace App\Modules\Users\Services;

use App\Modules\Users\Models\Document;
use App\Modules\Users\Repositories\UserRepository;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    private UserRepository $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function upload(int $userId, array $fileData, string $type): Document
    {
        $file = $fileData["file"];
        $fileName = Str::random(32) . "." . $file->getClientOriginalExtension();
        $path = "documents/" . $userId . "/" . $type . "/" . $fileName;

        Storage::disk("public")->put($path, file_get_contents($file));

        return Document::create([
            "user_id" => $userId,
            "type" => $type,
            "filename" => $file->getClientOriginalName(),
            "mime_type" => $file->getClientMimeType(),
            "path" => $path,
            "size" => $file->getSize(),
            "status" => "pending",
        ]);
    }

    public function getByType(int $userId, string $type): array
    {
        return Document::where("user_id", $userId)->where("type", $type)->latest()->get()->toArray();
    }

    public function getAllDocuments(int $userId): array
    {
        return Document::where("user_id", $userId)->latest()->get()->toArray();
    }

    public function verify(int $documentId): Document
    {
        $document = Document::findOrFail($documentId);
        $document->verify();
        return $document;
    }

    public function reject(int $documentId, string $reason): Document
    {
        $document = Document::findOrFail($documentId);
        $document->reject($reason);
        return $document;
    }

    public function delete(int $documentId): bool
    {
        $document = Document::findOrFail($documentId);
        if (Storage::disk("public")->exists($document->path)) {
            Storage::disk("public")->delete($document->path);
        }
        return $document->delete();
    }
}
