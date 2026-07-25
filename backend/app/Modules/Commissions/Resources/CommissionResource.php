<?php

namespace App\Modules\Commissions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'payment_id' => $this->payment_id,
            'amount' => (float) $this->amount,
            'percentage' => (float) $this->percentage,
            'status' => $this->status,
            'calculated_at' => $this->calculated_at,
            'paid_at' => $this->paid_at,
        ];
    }
}
