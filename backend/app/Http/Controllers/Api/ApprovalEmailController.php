<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\CreditApprovalMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * SPA invia nome/cognome + importo approvato; Laravel manda l'email al cliente.
 */
class ApprovalEmailController extends Controller
{
    public function sendCreditApproval(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'firstName' => ['nullable', 'string', 'max:120'],
            'lastName' => ['nullable', 'string', 'max:120'],
            'fullName' => ['nullable', 'string', 'max:240'],
            /** Importo in euro (float) o già formattato in amountFormatted */
            'amountEuros' => ['required', 'numeric', 'min:0'],
            'amountFormatted' => ['nullable', 'string', 'max:64'],
        ]);

        $first = trim((string) ($data['firstName'] ?? ''));
        $last = trim((string) ($data['lastName'] ?? ''));
        $full = trim((string) ($data['fullName'] ?? ''));
        if ($full === '') {
            $full = trim($first.' '.$last);
        }
        if ($full === '') {
            $full = 'Cliente Velora';
        }

        $euros = (float) $data['amountEuros'];
        $formatted = trim((string) ($data['amountFormatted'] ?? ''));
        if ($formatted === '') {
            $formatted = number_format($euros, 2, ',', '.').' €';
        }

        try {
            Mail::to($data['email'])->send(new CreditApprovalMail(
                firstName: $first,
                lastName: $last,
                fullName: $full,
                amountFormatted: $formatted,
                amountEuros: $euros,
            ));
        } catch (\Throwable $e) {
            Log::error('Credit approval mail failed', [
                'email' => $data['email'],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Invio email non riuscito: '.$e->getMessage(),
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Email di approvazione inviata',
            'to' => $data['email'],
        ]);
    }
}
