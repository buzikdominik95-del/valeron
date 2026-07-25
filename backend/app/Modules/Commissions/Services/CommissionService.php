<?php

namespace App\Modules\Commissions\Services;

use App\Modules\Commissions\Models\Commission;
use App\Modules\Payments\Models\Payment;
use App\Modules\Users\Models\User;

class CommissionService
{
    public function calculateCommission(Payment $payment, float $percentage): Commission
    {
        $commissionAmount = $payment->amount * ($percentage / 100);

        return Commission::create([
            'user_id' => $payment->user_id,
            'payment_id' => $payment->id,
            'amount' => $commissionAmount,
            'percentage' => $percentage,
            'status' => 'pending',
            'calculated_at' => now(),
        ]);
    }

    public function payoutCommission(Commission $commission): bool
    {
        try {
            // Simulate payout to user account
            $commission->markAsPaid();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function getUserCommissions(User $user): array
    {
        return $user->commissions()->latest()->get()->toArray();
    }

    public function getPendingCommissions(User $user): array
    {
        return $user->commissions()->where('status', 'pending')->latest()->get()->toArray();
    }

    public function getTotalCommissions(User $user, ?\DateTime $from = null, ?\DateTime $to = null): float
    {
        $query = $user->commissions()->where('status', 'paid');

        if ($from) {
            $query->whereDate('paid_at', '>=', $from);
        }
        if ($to) {
            $query->whereDate('paid_at', '<=', $to);
        }

        return (float) $query->sum('amount');
    }

    public function processMonthlyPayouts(): array
    {
        $pendingCommissions = Commission::where('status', 'pending')
            ->whereDate('calculated_at', '<=', now()->subDays(7))
            ->get();

        $results = [];
        foreach ($pendingCommissions as $commission) {
            $results[] = [
                'commission_id' => $commission->id,
                'success' => $this->payoutCommission($commission),
            ];
        }

        return $results;
    }
}
