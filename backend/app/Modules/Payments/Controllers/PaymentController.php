<?php

namespace App\Modules\Payments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Payments\Services\PaymentService;
use App\Modules\Payments\Resources\PaymentResource;
use App\Modules\Payments\Resources\InvoiceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function createPayment(Request $request): JsonResponse
    {
        $payment = $this->paymentService->createPayment(
            auth()->user(),
            $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'string|size:3',
                'payment_method' => 'required|string|in:card,bank_transfer,crypto',
                'description' => 'nullable|string',
            ])
        );

        return response()->json([
            'message' => 'Payment created',
            'data' => new PaymentResource($payment)
        ], 201);
    }

    public function getPayments(): JsonResponse
    {
        $payments = $this->paymentService->getPaymentHistory(auth()->user());
        return response()->json([
            'data' => PaymentResource::collection(collect($payments))
        ]);
    }

    public function refundPayment(int $paymentId): JsonResponse
    {
        $payment = Payment::findOrFail($paymentId);
        $success = $this->paymentService->refundPayment($payment);

        return response()->json([
            'message' => $success ? 'Payment refunded' : 'Refund failed',
            'data' => new PaymentResource($payment)
        ]);
    }

    public function createInvoice(Request $request): JsonResponse
    {
        $invoice = $this->paymentService->createInvoice(
            auth()->user(),
            $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'string|size:3',
                'days' => 'integer|min:1|max:365',
                'description' => 'nullable|string',
            ])
        );

        return response()->json([
            'message' => 'Invoice created',
            'data' => new InvoiceResource($invoice)
        ], 201);
    }

    public function getInvoices(): JsonResponse
    {
        $invoices = $this->paymentService->getInvoices(auth()->user());
        return response()->json([
            'data' => InvoiceResource::collection(collect($invoices))
        ]);
    }
}
