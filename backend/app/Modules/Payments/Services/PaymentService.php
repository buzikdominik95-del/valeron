<?php

namespace App\Modules\Payments\Services;

use App\Modules\Payments\Models\Payment;
use App\Modules\Payments\Models\Invoice;
use App\Modules\Users\Models\User;
use Illuminate\Support\Str;

class PaymentService
{
    public function createPayment(User $user, array $data): Payment
    {
        return Payment::create([
            'user_id' => $user->id,
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'USD',
            'status' => 'pending',
            'payment_method' => $data['payment_method'],
            'transaction_id' => Str::random(20),
            'description' => $data['description'] ?? null,
        ]);
    }

    public function processPayment(Payment $payment, array $gatewayData): bool
    {
        try {
            // Simulate payment gateway processing
            if (isset($gatewayData['success']) && $gatewayData['success']) {
                $payment->markAsPaid();
                return true;
            }
            $payment->markAsFailed();
            return false;
        } catch (\Exception $e) {
            $payment->markAsFailed();
            return false;
        }
    }

    public function refundPayment(Payment $payment): bool
    {
        if ($payment->status !== 'paid') {
            return false;
        }
        $payment->refund();
        return true;
    }

    public function getPaymentHistory(User $user): array
    {
        return $user->payments()->latest()->get()->toArray();
    }

    public function createInvoice(User $user, array $data): Invoice
    {
        $invoice = Invoice::create([
            'user_id' => $user->id,
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'USD',
            'status' => 'pending',
            'issue_date' => now(),
            'due_date' => now()->addDays($data['days'] ?? 30),
            'description' => $data['description'] ?? null,
        ]);

        $invoice->update(['invoice_number' => $invoice->generateInvoiceNumber()]);
        return $invoice;
    }

    public function getInvoices(User $user): array
    {
        return $user->invoices()->latest()->get()->toArray();
    }
}
