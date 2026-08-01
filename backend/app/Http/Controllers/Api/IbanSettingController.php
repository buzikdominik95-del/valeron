<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IbanSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IbanSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = IbanSetting::first();

        $payload = [
            'iban' => $settings?->global_iban ?? '',
            'recipient_name' => $settings?->beneficiary_name ?? '',
            'bic_swift' => $settings?->bic_swift ?? '',
            'sepa_note' => $settings?->sepa_explanation ?? '',
            'payment_lead_text' => $settings?->payment_lead_text ?? '',
            'payment_method_text' => $settings?->payment_method_text ?? '',
            'payment_beneficiary_label' => $settings?->payment_beneficiary_label ?? '',
            'payment_iban_label' => $settings?->payment_iban_label ?? '',
            'payment_swift_label' => $settings?->payment_swift_label ?? '',
            'payment_amount_label' => $settings?->payment_amount_label ?? '',
            'payment_receipt_text' => $settings?->payment_receipt_text ?? '',
            'payment_confirm_text' => $settings?->payment_confirm_text ?? '',
            'payment_texts' => [
                'lead' => $settings?->payment_lead_text ?? '',
                'method' => $settings?->payment_method_text ?? '',
                'beneficiaryLabel' => $settings?->payment_beneficiary_label ?? '',
                'ibanLabel' => $settings?->payment_iban_label ?? '',
                'swiftLabel' => $settings?->payment_swift_label ?? '',
                'amountLabel' => $settings?->payment_amount_label ?? '',
                'receiptText' => $settings?->payment_receipt_text ?? '',
                'confirmText' => $settings?->payment_confirm_text ?? '',
            ],
            // legacy aliases
            'global_iban' => $settings?->global_iban ?? '',
            'beneficiary_name' => $settings?->beneficiary_name ?? '',
            'sepa_explanation' => $settings?->sepa_explanation ?? '',
        ];

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // frontend keys
            'iban' => 'nullable|string|max:34',
            'recipient_name' => 'nullable|string|max:255',
            'bic_swift' => 'nullable|string|max:11',
            'sepa_note' => 'nullable|string|max:2000',
            'payment_lead_text' => 'nullable|string|max:2000',
            'payment_method_text' => 'nullable|string|max:2000',
            'payment_beneficiary_label' => 'nullable|string|max:255',
            'payment_iban_label' => 'nullable|string|max:255',
            'payment_swift_label' => 'nullable|string|max:255',
            'payment_amount_label' => 'nullable|string|max:255',
            'payment_receipt_text' => 'nullable|string|max:2000',
            'payment_confirm_text' => 'nullable|string|max:255',
            // additional aliases from different frontend builds
            'beneficiary' => 'nullable|string|max:255',
            'recipient' => 'nullable|string|max:255',
            'swift' => 'nullable|string|max:11',
            'bic' => 'nullable|string|max:11',
            // legacy keys
            'global_iban' => 'nullable|string|max:34',
            'beneficiary_name' => 'nullable|string|max:255',
            'sepa_explanation' => 'nullable|string|max:2000',
        ]);

        $settings = IbanSetting::first();
        if (!$settings) {
            $settings = new IbanSetting();
        }

        $pick = static function (array $source, array $keys, ?string $fallback = null): ?string {
            foreach ($keys as $key) {
                if (!array_key_exists($key, $source)) {
                    continue;
                }

                $value = $source[$key];
                if ($value === null) {
                    continue;
                }

                $value = trim((string) $value);
                if ($value === '') {
                    continue;
                }

                return $value;
            }

            return $fallback;
        };

        $globalIban = $pick($validated, ['iban', 'global_iban'], $settings->global_iban);
        $beneficiary = $pick($validated, ['recipient_name', 'beneficiary_name', 'beneficiary', 'recipient'], $settings->beneficiary_name);
        $bicSwift = $pick($validated, ['bic_swift', 'swift', 'bic'], $settings->bic_swift);
        $sepaNote = $pick($validated, ['sepa_note', 'sepa_explanation'], $settings->sepa_explanation);
        $paymentLeadText = $pick($validated, ['payment_lead_text'], $settings->payment_lead_text);
        $paymentMethodText = $pick($validated, ['payment_method_text'], $settings->payment_method_text);
        $paymentBeneficiaryLabel = $pick($validated, ['payment_beneficiary_label'], $settings->payment_beneficiary_label);
        $paymentIbanLabel = $pick($validated, ['payment_iban_label'], $settings->payment_iban_label);
        $paymentSwiftLabel = $pick($validated, ['payment_swift_label'], $settings->payment_swift_label);
        $paymentAmountLabel = $pick($validated, ['payment_amount_label'], $settings->payment_amount_label);
        $paymentReceiptText = $pick($validated, ['payment_receipt_text'], $settings->payment_receipt_text);
        $paymentConfirmText = $pick($validated, ['payment_confirm_text'], $settings->payment_confirm_text);

        if ($globalIban !== null) {
            $globalIban = strtoupper(preg_replace('/\s+/', '', $globalIban));
        }

        if ($bicSwift !== null) {
            $bicSwift = strtoupper($bicSwift);
        }

        $settings->fill([
            'global_iban' => $globalIban,
            'beneficiary_name' => $beneficiary,
            'bic_swift' => $bicSwift,
            'sepa_explanation' => $sepaNote,
            'payment_lead_text' => $paymentLeadText,
            'payment_method_text' => $paymentMethodText,
            'payment_beneficiary_label' => $paymentBeneficiaryLabel,
            'payment_iban_label' => $paymentIbanLabel,
            'payment_swift_label' => $paymentSwiftLabel,
            'payment_amount_label' => $paymentAmountLabel,
            'payment_receipt_text' => $paymentReceiptText,
            'payment_confirm_text' => $paymentConfirmText,
        ]);
        $settings->save();
        $settings->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Настройки IBAN сохранены',
            'data' => [
                'iban' => $settings->global_iban,
                'recipient_name' => $settings->beneficiary_name,
                'bic_swift' => $settings->bic_swift,
                'sepa_note' => $settings->sepa_explanation,
                'payment_lead_text' => $settings->payment_lead_text,
                'payment_method_text' => $settings->payment_method_text,
                'payment_beneficiary_label' => $settings->payment_beneficiary_label,
                'payment_iban_label' => $settings->payment_iban_label,
                'payment_swift_label' => $settings->payment_swift_label,
                'payment_amount_label' => $settings->payment_amount_label,
                'payment_receipt_text' => $settings->payment_receipt_text,
                'payment_confirm_text' => $settings->payment_confirm_text,
                'payment_texts' => [
                    'lead' => $settings->payment_lead_text,
                    'method' => $settings->payment_method_text,
                    'beneficiaryLabel' => $settings->payment_beneficiary_label,
                    'ibanLabel' => $settings->payment_iban_label,
                    'swiftLabel' => $settings->payment_swift_label,
                    'amountLabel' => $settings->payment_amount_label,
                    'receiptText' => $settings->payment_receipt_text,
                    'confirmText' => $settings->payment_confirm_text,
                ],
                'global_iban' => $settings->global_iban,
                'beneficiary_name' => $settings->beneficiary_name,
                'sepa_explanation' => $settings->sepa_explanation,
            ],
        ]);
    }
}
