<?php

namespace App\Modules\Payments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'invoice_number' => $this->invoice_number,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'issue_date' => $this->issue_date,
            'due_date' => $this->due_date,
            'description' => $this->description,
            'paid_at' => $this->paid_at,
        ];
    }
}
