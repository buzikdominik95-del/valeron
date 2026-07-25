<?php

namespace App\Modules\Commissions\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Commissions\Services\CommissionService;
use App\Modules\Commissions\Resources\CommissionResource;
use Illuminate\Http\JsonResponse;

class CommissionController extends Controller
{
    public function __construct(private CommissionService $commissionService) {}

    public function getMyCommissions(): JsonResponse
    {
        $commissions = $this->commissionService->getUserCommissions(auth()->user());
        return response()->json([
            'data' => CommissionResource::collection(collect($commissions))
        ]);
    }

    public function getPending(): JsonResponse
    {
        $pending = $this->commissionService->getPendingCommissions(auth()->user());
        return response()->json([
            'data' => CommissionResource::collection(collect($pending))
        ]);
    }

    public function getStats(): JsonResponse
    {
        $user = auth()->user();
        $total = $this->commissionService->getTotalCommissions($user);
        $pending = $this->commissionService->getPendingCommissions($user);

        return response()->json([
            'total_earned' => $total,
            'pending_count' => count($pending),
            'pending_amount' => collect($pending)->sum('amount'),
        ]);
    }

    public function requestPayout(): JsonResponse
    {
        $user = auth()->user();
        $pending = $this->commissionService->getPendingCommissions($user);

        if (empty($pending)) {
            return response()->json(['message' => 'No pending commissions'], 400);
        }

        $totalAmount = collect($pending)->sum('amount');
        return response()->json([
            'message' => 'Payout requested',
            'amount' => $totalAmount,
            'count' => count($pending),
        ]);
    }
}
