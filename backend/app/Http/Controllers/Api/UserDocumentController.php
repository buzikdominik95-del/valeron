<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Users\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

        $verification = [
            'status' => 'pending',
            'soft_pass' => null,
            'reason' => null,
            'category' => null,
            'document_type' => null,
            'quality' => null,
            'confidence' => null,
        ];

        $decision = $this->verifyWithAi(
            filePath: $file->getRealPath(),
            backendType: $type,
            userId: (int) $user->id,
            documentId: (int) $document->id,
        );

        if (is_array($decision)) {
            $softPass = (bool)($decision['soft_pass'] ?? false);
            $reason = trim((string)($decision['soft_reject_reason'] ?? $decision['reason'] ?? ''));

            $isDocument = $this->toBool($decision['is_document'] ?? false);
            $category = strtolower(trim((string)($decision['category'] ?? '')));
            $docType = strtolower(trim((string)($decision['document_type'] ?? '')));
            $textVisible = $this->toBool($decision['text_visible'] ?? false);
            $fullyVisible = $this->toBool($decision['document_fully_visible'] ?? false);
            $confidence = (float)($decision['confidence'] ?? 0);
            $minConfidence = (float) config('services.document_ai.min_confidence', 0.45);

            $allowedDocTypes = $this->allowedVisionDocTypes($type);
            $docTypeAllowed = in_array($docType, $allowedDocTypes, true);
            $identityCategoryRequired = in_array($type, ['passport', 'license'], true);
            $categoryOk = !$identityCategoryRequired || $category === 'identity_document';

            $accepted = $softPass
                && $isDocument
                && $docTypeAllowed
                && $categoryOk
                && $textVisible
                && $fullyVisible
                && $confidence >= $minConfidence;

            if ($accepted) {
                $document->verify();
            } else {
                $fallbackReason = 'Изображение не похоже на документ. Загрузите фото паспорта, ID-карты или водительских прав.';
                $document->reject($reason !== '' ? $reason : $fallbackReason);
            }

            $verification = [
                'status' => $document->status,
                'soft_pass' => $accepted,
                'reason' => $document->rejection_reason,
                'is_document' => $isDocument,
                'category' => $decision['category'] ?? null,
                'document_type' => $decision['document_type'] ?? null,
                'quality' => $decision['quality'] ?? null,
                'text_visible' => $textVisible,
                'document_fully_visible' => $fullyVisible,
                'confidence' => $decision['confidence'] ?? null,
            ];
        }

        return response()->json([
            'message' => 'Document uploaded',
            'data' => [
                'id' => $document->id,
                'filename' => $document->filename,
                'mime_type' => $document->mime_type,
                'path' => $document->path,
                'url' => Storage::disk('public')->url($path),
                'status' => $document->status,
                'rejection_reason' => $document->rejection_reason,
                'verification' => $verification,
            ],
        ], 201);
    }

    private function verifyWithAi(string $filePath, string $backendType, int $userId, int $documentId): ?array
    {
        $enabled = (bool) config('services.document_ai.enabled', true);
        if (!$enabled) {
            return null;
        }

        $url = trim((string) config('services.document_ai.verify_url', 'http://ai_orchestrator:8000/v1/documents/verify-image'));
        $apiKey = trim((string) config('services.document_ai.api_key', ''));

        if ($url === '' || $apiKey === '') {
            return null;
        }

        $raw = @file_get_contents($filePath);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $mime = $this->normalizeVisionMime((string) (@mime_content_type($filePath) ?: ''));
        if ($mime === null) {
            // PDF/HEIC и т.п. сейчас в vision не отправляем — оставляем pending.
            return null;
        }

        $expectedType = $this->mapExpectedType($backendType);
        $requestId = 'u' . $userId . '-d' . $documentId . '-' . Str::lower(Str::random(8));
        $timeoutSec = (float) config('services.document_ai.timeout_sec', 35);

        try {
            $resp = Http::timeout($timeoutSec)
                ->acceptJson()
                ->withHeaders([
                    'X-API-Key' => $apiKey,
                ])
                ->post($url, [
                    'request_id' => $requestId,
                    'expected_document_type' => $expectedType,
                    'mime_type' => $mime,
                    'image_base64' => base64_encode($raw),
                ]);

            if (!$resp->ok()) {
                Log::warning('document_ai_verify_http_error', [
                    'status' => $resp->status(),
                    'user_id' => $userId,
                    'document_id' => $documentId,
                ]);
                return null;
            }

            $json = $resp->json();
            $result = is_array($json) && isset($json['result']) && is_array($json['result'])
                ? $json['result']
                : null;

            if (!is_array($result)) {
                return null;
            }

            return $result;
        } catch (\Throwable $e) {
            Log::warning('document_ai_verify_failed', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'document_id' => $documentId,
            ]);
            return null;
        }
    }


    private function allowedVisionDocTypes(string $backendType): array
    {
        return match ($backendType) {
            'passport', 'license' => ['passport', 'national_id', 'driver_license'],
            'contract' => ['contract'],
            'proof_of_address' => ['utility_bill', 'bank_statement'],
            default => ['passport', 'national_id', 'driver_license'],
        };
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        if (is_int($value) || is_float($value)) return (bool) $value;
        if (is_string($value)) {
            $v = strtolower(trim($value));
            return in_array($v, ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }

    private function normalizeVisionMime(string $mime): ?string
    {
        $m = strtolower(trim($mime));
        return match ($m) {
            'image/jpeg', 'image/jpg', 'image/pjpeg' => 'image/jpeg',
            'image/png' => 'image/png',
            'image/webp' => 'image/webp',
            default => null,
        };
    }

    private function mapExpectedType(string $backendType): string
    {
        return match ($backendType) {
            'passport' => 'passport',
            'license' => 'driver_license',
            'contract' => 'contract',
            'proof_of_address' => 'utility_bill',
            default => 'passport',
        };
    }
}
