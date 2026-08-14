<?php

namespace App\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:20480',
            'type' => 'required|string|in:passport,license,contract,proof_of_address',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File is required',
            'file.max' => 'File size cannot exceed 20MB',
            'type.required' => 'Document type is required',
        ];
    }
}
