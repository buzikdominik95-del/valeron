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
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx',
            'type' => 'required|string|in:passport,license,contract,proof_of_address',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File is required',
            'file.max' => 'File size cannot exceed 10MB',
            'file.mimes' => 'File format not supported',
            'type.required' => 'Document type is required',
        ];
    }
}
