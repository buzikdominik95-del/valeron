<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\CommissionLevel;
use App\Models\IbanSetting;
use App\Models\Tag;
use App\Support\ManagerTrafficAssigner;
use App\Mail\ContractSignedMail;
use App\Mail\CertificatoMail;
use App\Mail\WithdrawFailMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'body' => 'required|string|max:5000',
            'kind' => 'nullable|string',
            'level' => 'nullable|integer',
            'email' => 'nullable|email',
            'name' => 'nullable|string',
            'attachment_kind' => 'nullable|string|in:image,file',
            'attachment_name' => 'nullable|string|max:255',
            'attachment_url' => 'nullable|url|max:2048',
            'attachment_mime' => 'nullable|string|max:255',
            'attachment_file' => 'nullable|file|max:10240',
        ]);

        // Важно: чат должен идти по email текущего клиента в UI,
        // иначе при живой auth-сессии другого пользователя сообщение может
        // сохраниться в "чужой" чат и затем исчезнуть после sync по email.
        $email = trim((string) $request->input('email', ''));

        if ($email !== '') {
            $name = trim((string) $request->input('name', ''));
            if ($name === '') {
                $name = 'Anonymous';
            }

            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => bcrypt(\Illuminate\Support\Str::random(32)), 'commission_level_id' => 1]
            );
        } else {
            $user = Auth::user();

            // Fallback для старых/анонимных запросов без email.
            if (!$user) {
                $user = User::firstOrCreate(
                    ['email' => 'anonymous@it-velora.com'],
                    ['name' => 'Anonymous', 'password' => bcrypt(\Illuminate\Support\Str::random(32)), 'commission_level_id' => 1]
                );
            }
        }
        
        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active', 'manager_id' => $assignedManagerId]
        );

        if ($assignedManagerId && !$chat->manager_id) {
            $chat->manager_id = $assignedManagerId;
            $chat->save();
        }

        $this->attachDefaultFdTag($chat);

        $attachmentKind = trim((string) $request->input('attachment_kind', ''));
        $attachmentName = trim((string) $request->input('attachment_name', ''));
        $attachmentUrl = trim((string) $request->input('attachment_url', ''));
        $attachmentMime = trim((string) $request->input('attachment_mime', ''));

        if ($request->hasFile('attachment_file')) {
            $uploaded = $request->file('attachment_file');
            if ($uploaded && $uploaded->isValid()) {
                $extension = trim((string) $uploaded->getClientOriginalExtension());
                $safeFile = $extension !== ''
                    ? Str::uuid()->toString().'.'.$extension
                    : Str::uuid()->toString();
                $storedPath = $uploaded->storeAs('chat_attachments/'.$user->id, $safeFile, 'public');

                if (is_string($storedPath) && $storedPath !== '') {
                    $attachmentUrl = '/storage/'.ltrim($storedPath, '/');
                    $attachmentMime = trim((string) ($uploaded->getClientMimeType() ?? $attachmentMime));
                    $attachmentName = trim((string) $uploaded->getClientOriginalName());

                    if ($attachmentName === '') {
                        $attachmentName = 'attachment';
                    }

                    if ($attachmentKind === '') {
                        $attachmentKind = str_starts_with(strtolower($attachmentMime), 'image/')
                            ? 'image'
                            : 'file';
                    }
                }
            }
        }

        if (!in_array($attachmentKind, ['image', 'file'], true)) {
            $attachmentKind = null;
        }

        if ($attachmentUrl === '') {
            $attachmentUrl = null;
            $attachmentName = null;
            $attachmentMime = null;
            $attachmentKind = null;
        }

        $message = $chat->messages()->create([
            'sender_type' => 'user',
            'sender_id' => $user->id,
            'message' => $request->body,
            'attachment_kind' => $attachmentKind,
            'attachment_name' => $attachmentName,
            'attachment_url' => $attachmentUrl,
            'attachment_mime' => $attachmentMime,
            'is_read' => false,
        ]);

        $chat->touch();

        $responseAttachmentUrl = $this->normalizeAttachmentUrl($message->attachment_url ?? null);

        $hasAttachment = !empty($responseAttachmentUrl) ? in_array((string) $message->attachment_kind, ['image', 'file'], true) : false;
        return response()->json([
            'ok' => true,
            'message' => [
                'id' => $message->id,
                'text' => $message->message,
                'created_at' => $message->created_at,
                'attachment' => $hasAttachment ? [
                    'kind' => (string) $message->attachment_kind,
                    'name' => (string) ($message->attachment_name ?? ''),
                    'url' => (string) $responseAttachmentUrl,
                    'mime' => (string) ($message->attachment_mime ?? ''),
                ] : null,
            ],
        ]);
    }

    public function getMessages(Request $request)
    {
        // Для консистентности с sendMessage: если email пришёл, читаем именно его тред.
        $email = trim((string) $request->input('email', ''));

        if ($email !== '') {
            $user = User::where('email', $email)->first();
        } else {
            $user = Auth::user();
            if (!$user) {
                $user = User::where('email', 'anonymous@it-velora.com')->first();
            }
        }
        
        if (!$user) {
            return response()->json(['messages' => []]);
        }
        
        $chat = Chat::where('user_id', $user->id)->first();
        
        if (!$chat) {
            return response()->json(['messages' => []]);
        }

        $messages = $chat->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                $attachmentUrl = $this->normalizeAttachmentUrl($msg->attachment_url ?? null) ?? '';
                $attachmentKind = trim((string) ($msg->attachment_kind ?? ''));

                return [
                    'id' => $msg->id,
                    'author' => $msg->sender_type === 'manager' ? 'agent' : 'client',
                    'text' => $msg->message,
                    'at' => $msg->created_at->toISOString(),
                    'delivery' => 'sent',
                    'attachment' => ($attachmentUrl !== '' && in_array($attachmentKind, ['image', 'file'], true)) ? [
                        'kind' => $attachmentKind,
                        'name' => (string) ($msg->attachment_name ?? ''),
                        'url' => $attachmentUrl,
                        'mime' => (string) ($msg->attachment_mime ?? ''),
                    ] : null,
                ];
            });

        return response()
            ->json(['messages' => $messages])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function getAccount(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $nameParts = preg_split('/\s+/', trim((string) $user->name), 2);
        $firstName = $nameParts[0] ?? '';
        $lastName = trim((string) ($user->surname ?? ($nameParts[1] ?? '')));

        $leadProfile = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['credit_term_months', 'iban']);

        $leadIban = DB::table('ibans')
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (empty($leadIban) && !empty($leadProfile?->iban)) {
            $leadIban = (string) $leadProfile->iban;
        }

        $loanTermMonths = $this->extractLoanTermMonths($user->wizard_progress ?? null);
        if (($loanTermMonths ?? 0) <= 0 && !empty($leadProfile?->credit_term_months)) {
            $loanTermMonths = (int) $leadProfile->credit_term_months;
        }

        $level = (int) ($user->commission_level_id ?? 1);
        if ($level < 1) $level = 1;
        if ($level > 4) $level = 4;

        $phase = 'ready';
        if ($level === 3) {
            $phase = 'policy_build';
        }

        $fees = [
            1 => ['amountCents' => 3700, 'reason' => 'base'],
            2 => ['amountCents' => 17200, 'reason' => 'insurance'],
            3 => ['amountCents' => 13600, 'reason' => 'aml'],
            4 => ['amountCents' => 0, 'reason' => 'release'],
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
        $beneficiary = trim((string) ($ibanSettings?->beneficiary_name ?? 'Velora Servizi S.r.l.'));
        if ($beneficiary === '') {
            $beneficiary = 'Velora Servizi S.r.l.';
        }

        $ibanRaw = strtoupper(preg_replace('/\s+/', '', (string) ($ibanSettings?->global_iban ?? 'IT09T0200809005000043094427')));
        if ($ibanRaw === '') {
            $ibanRaw = 'IT09T0200809005000043094427';
        }

        $swift = strtoupper(trim((string) ($ibanSettings?->bic_swift ?? 'UNCRITMMXXX')));
        if ($swift === '') {
            $swift = 'UNCRITMMXXX';
        }

        $paymentCoords = [
            'method' => 'sepa_instant',
            'beneficiary' => $beneficiary,
            'iban' => $ibanRaw,
            'swift' => $swift,
            'amountCents' => (int) $fee['amountCents'],
        ];

        $animations = [
            1 => 0,
            2 => 7 * 60 * 1000,
            3 => 0,
            4 => 3 * 60 * 1000,
        ];

        return response()->json([
            'client' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $user->email,
                'lead_iban' => $leadIban,
            ],
            'credit' => [
                'approvedAmountCents' => (int) round(((float) ($user->requested_amount ?? 0)) * 100),
                'ratePercent' => 3.8,
                'isNew' => false,
                'termMonths' => $loanTermMonths,
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
            'loan_term_months' => $loanTermMonths,
            'lead_iban' => $leadIban,
            'payment_coords' => $paymentCoords,
            'paymentCoords' => $paymentCoords,
        ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }


    public function saveIban(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'iban' => 'required|string|max:64',
            'bic' => 'nullable|string|max:32',
            'bank_name' => 'nullable|string|max:255',
            'account_holder' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
        ]);

        $iban = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) ($validated['iban'] ?? '')));
        if (strlen($iban) < 10) {
            return response()->json([
                'message' => 'IBAN non valido',
                'errors' => ['iban' => ['IBAN non valido']],
            ], 422);
        }

        $isDefault = array_key_exists('is_default', $validated)
            ? (bool) $validated['is_default']
            : true;

        $accountHolder = trim((string) ($validated['account_holder'] ?? ''));
        if ($accountHolder === '') {
            $accountHolder = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));
        }

        DB::transaction(function () use ($user, $validated, $iban, $isDefault, $accountHolder) {
            if ($isDefault) {
                DB::table('ibans')
                    ->where('user_id', $user->id)
                    ->update([
                        'is_default' => false,
                        'updated_at' => now(),
                    ]);
            }

            $existingId = DB::table('ibans')
                ->where('user_id', $user->id)
                ->whereRaw('UPPER(iban) = ?', [$iban])
                ->value('id');

            $payload = [
                'user_id' => $user->id,
                'iban' => $iban,
                'bic' => $validated['bic'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'account_holder' => $accountHolder !== '' ? $accountHolder : null,
                'status' => 'pending',
                'is_default' => $isDefault,
                'updated_at' => now(),
            ];

            if ($existingId) {
                DB::table('ibans')->where('id', $existingId)->update($payload);
            } else {
                $payload['created_at'] = now();
                DB::table('ibans')->insert($payload);
            }
        });

        DB::table('leads')
            ->where('user_id', $user->id)
            ->update([
                'iban' => $iban,
                'updated_at' => now(),
            ]);

        return response()->json([
            'ok' => true,
            'lead_iban' => $iban,
        ]);
    }

    public function saveWizardProgress(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'wizard_progress' => 'nullable',
            'loan_term_months' => 'nullable|integer|min:1|max:600',
            'loan_term' => 'nullable|integer|min:1|max:600',
            'credit_term_months' => 'nullable|integer|min:1|max:600',
            'credit_term' => 'nullable|integer|min:1|max:600',
            'term_months' => 'nullable|integer|min:1|max:600',
            'term' => 'nullable|integer|min:1|max:600',
            'requested_term_months' => 'nullable|integer|min:1|max:600',
            'requested_term' => 'nullable|integer|min:1|max:600',
        ]);

        $currentProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);

        $rawIncomingProgress = $validated['wizard_progress'] ?? null;
        if (is_array($rawIncomingProgress)) {
            $currentProgress = array_merge($currentProgress, $rawIncomingProgress);
        } elseif (is_string($rawIncomingProgress) && trim($rawIncomingProgress) !== '') {
            $decodedIncoming = json_decode($rawIncomingProgress, true);
            if (is_array($decodedIncoming)) {
                $currentProgress = array_merge($currentProgress, $decodedIncoming);
            }
        }

        $loanTermMonths = $this->extractLoanTermMonths($validated);
        if ($loanTermMonths !== null) {
            $currentProgress['loan_term_months'] = $loanTermMonths;
            $currentProgress['term_months'] = $loanTermMonths;
            $currentProgress['term'] = $loanTermMonths;

            $credit = isset($currentProgress['credit']) && is_array($currentProgress['credit'])
                ? $currentProgress['credit']
                : [];
            $credit['term_months'] = $loanTermMonths;
            $currentProgress['credit'] = $credit;
        }

        $user->wizard_progress = empty($currentProgress)
            ? null
            : json_encode($currentProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $resolvedTermMonths = $this->extractLoanTermMonths($currentProgress);

        if (($resolvedTermMonths ?? 0) > 0) {
            DB::table('leads')
                ->where('user_id', $user->id)
                ->update([
                    'credit_term_months' => $resolvedTermMonths,
                    'updated_at' => now(),
                ]);
        }

        $this->syncDocumentsStatusForUser($user, $currentProgress);
        $this->syncProfileFieldsFromWizardProgress($user, $currentProgress);

        $resolvedIban = $this->extractIbanValue($currentProgress);
        if ($resolvedIban !== null) {
            $this->syncIbanFromWizardProgress($user, $resolvedIban);
        }

        return response()->json([
            'ok' => true,
            'loan_term_months' => $resolvedTermMonths,
            'lead_iban' => $resolvedIban,
        ]);
    }


    public function sendSignedContract(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'signature_data_url' => 'nullable|string',
            'signed_at' => 'nullable|date',
        ]);

        $wizardProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);

        $signedAt = isset($validated['signed_at'])
            ? \Illuminate\Support\Carbon::parse((string) $validated['signed_at'])
            : now();

        $wizardProgress['contract_signed'] = true;
        $wizardProgress['contract_signed_at'] = $signedAt->toIso8601String();

        $signatureDataUrl = trim((string) ($validated['signature_data_url'] ?? ''));
        if ($signatureDataUrl !== '') {
            $wizardProgress['contract_signature_data_url'] = $signatureDataUrl;
        }

        $user->wizard_progress = json_encode($wizardProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $lead = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['requested_amount', 'credit_term_months', 'iban']);

        $fullName = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));
        if ($fullName === '') {
            $fullName = trim((string) $user->name);
        }
        if ($fullName === '') {
            $fullName = 'Cliente Velora';
        }

        $amount = (float) ($user->requested_amount ?? 0);
        if ($amount <= 0 && isset($lead?->requested_amount)) {
            $amount = (float) $lead->requested_amount;
        }

        $termMonths = $this->extractLoanTermMonths($wizardProgress);
        if (($termMonths ?? 0) <= 0 && isset($lead?->credit_term_months)) {
            $termMonths = (int) $lead->credit_term_months;
        }

        $iban = DB::table('ibans')
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (!$iban && isset($lead?->iban)) {
            $iban = (string) $lead->iban;
        }
        if (!$iban) {
            $iban = $this->extractIbanValue($wizardProgress);
        }

        $contract = [
            'contract_number' => 'VEL-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT).'-'.now()->format('YmdHis'),
            'full_name' => $fullName,
            'email' => (string) $user->email,
            'amount' => $amount,
            'amount_formatted' => $this->formatEuro($amount),
            'term_months' => ($termMonths ?? 0) > 0 ? (int) $termMonths : null,
            'iban' => $this->formatIbanDisplay((string) ($iban ?? '')),
            'document_type' => trim((string) ($user->document_type ?? '')),
            'document_number' => trim((string) ($user->document_number ?? '')),
            'signed_at_iso' => $signedAt->toIso8601String(),
            'signed_at_human' => $signedAt->setTimezone('Europe/Rome')->format('d/m/Y H:i:s'),
        ];

        $pdfFileName = 'contract_'.$user->id.'_'.$signedAt->format('Ymd_His').'.pdf';

        try {
            $pdfBinary = $this->renderContractPdfBinary($contract);

            Mail::to($user->email)->send(new ContractSignedMail(
                contract: $contract,
                pdfBinary: $pdfBinary,
                pdfFileName: $pdfFileName,
            ));
        } catch (\Throwable $e) {
            Log::error('Signed contract mail failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Invio email contratto non riuscito',
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'mailed_to' => $user->email,
            'contract_file' => $pdfFileName,
            'signed_at' => $contract['signed_at_iso'],
        ]);
    }

    private function renderContractPdfBinary(array $contract): string
    {
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('mails.contract-pdf', ['contract' => $contract]);
        $pdf->setPaper('a4');

        return (string) $pdf->output();
    }

    private function formatEuro(float $amount): string
    {
        return number_format($amount, 2, ',', '.').' €';
    }

    private function formatIbanDisplay(string $iban): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9]/', '', $iban));
        if ($clean === '') {
            return '';
        }

        return trim(chunk_split($clean, 4, ' '));
    }


    public function sendCpiCertificateEmail(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'viewed_at' => 'nullable|date',
        ]);

        $viewedAt = isset($validated['viewed_at'])
            ? \Illuminate\Support\Carbon::parse((string) $validated['viewed_at'])
            : now();

        $wizardProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);
        $wizardProgress['cpi_certificate_viewed'] = true;
        $wizardProgress['cpi_certificate_viewed_at'] = $viewedAt->toIso8601String();
        $user->wizard_progress = json_encode($wizardProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $lead = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['requested_amount', 'credit_term_months', 'iban']);

        $fullName = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));
        if ($fullName === '') {
            $fullName = trim((string) $user->name);
        }
        if ($fullName === '') {
            $fullName = 'Cliente Velora';
        }

        $amount = (float) ($user->requested_amount ?? 0);
        if ($amount <= 0 && isset($lead?->requested_amount)) {
            $amount = (float) $lead->requested_amount;
        }

        $termMonths = $this->extractLoanTermMonths($wizardProgress);
        if (($termMonths ?? 0) <= 0 && isset($lead?->credit_term_months)) {
            $termMonths = (int) $lead->credit_term_months;
        }

        $iban = DB::table('ibans')
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (!$iban && isset($lead?->iban)) {
            $iban = (string) $lead->iban;
        }
        if (!$iban) {
            $iban = $this->extractIbanValue($wizardProgress);
        }

        $certificate = [
            'certificate_number' => 'CPI-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT).'-'.now()->format('YmdHis'),
            'full_name' => $fullName,
            'email' => (string) $user->email,
            'amount' => $amount,
            'amount_formatted' => $this->formatEuro($amount),
            'term_months' => ($termMonths ?? 0) > 0 ? (int) $termMonths : null,
            'iban' => $this->formatIbanDisplay((string) ($iban ?? '')),
            'document_type' => trim((string) ($user->document_type ?? '')),
            'document_number' => trim((string) ($user->document_number ?? '')),
            'issued_at_iso' => $viewedAt->toIso8601String(),
            'issued_at_human' => $viewedAt->setTimezone('Europe/Rome')->format('d/m/Y H:i:s'),
        ];

        $pdfFileName = 'Certificato_CPI_'.$user->id.'_'.$viewedAt->format('Ymd_His').'.pdf';

        try {
            $pdfBinary = $this->renderCpiCertificatePdfBinary($certificate);

            Mail::to($user->email)->send(new CertificatoMail(
                certificate: $certificate,
                pdfBinary: $pdfBinary,
                pdfFileName: $pdfFileName,
            ));
        } catch (\Throwable $e) {
            Log::error('CPI certificate mail failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Invio email certificato non riuscito',
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'mailed_to' => $user->email,
            'certificate_file' => $pdfFileName,
            'issued_at' => $certificate['issued_at_iso'],
        ]);
    }

    private function renderCpiCertificatePdfBinary(array $certificate): string
    {
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('mails.certificato-pdf', ['certificate' => $certificate]);
        $pdf->setPaper('a4');

        return (string) $pdf->output();
    }


    public function sendWithdrawFailEmail(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $eventAt = now();

        $wizardProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);
        $wizardProgress['withdraw_fail_notified_at'] = $eventAt->toIso8601String();
        $user->wizard_progress = json_encode($wizardProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $lead = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['requested_amount', 'iban']);

        $fullName = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));
        if ($fullName === '') {
            $fullName = trim((string) $user->name);
        }
        if ($fullName === '') {
            $fullName = 'Cliente Velora';
        }

        $amount = (float) ($user->requested_amount ?? 0);
        if ($amount <= 0 && isset($lead?->requested_amount)) {
            $amount = (float) $lead->requested_amount;
        }

        $iban = DB::table('ibans')
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->value('iban');

        if (!$iban && isset($lead?->iban)) {
            $iban = (string) $lead->iban;
        }
        if (!$iban) {
            $iban = $this->extractIbanValue($wizardProgress);
        }

        $mailPayload = [
            'full_name' => $fullName,
            'email' => (string) $user->email,
            'amount_formatted' => $this->formatEuro($amount),
            'iban' => $this->formatIbanDisplay((string) ($iban ?? '')),
            'event_at_iso' => $eventAt->toIso8601String(),
            'event_at_human' => $eventAt->setTimezone('Europe/Rome')->format('d/m/Y H:i:s'),
        ];

        try {
            Mail::to($user->email)->send(new WithdrawFailMail($mailPayload));
        } catch (\Throwable $e) {
            Log::error('Withdraw fail mail failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Invio email withdraw-fail non riuscito',
            ], 502);
        }

        return response()->json([
            'ok' => true,
            'mailed_to' => $user->email,
            'event_at' => $mailPayload['event_at_iso'],
        ]);
    }

    private function decodeWizardProgressData($rawData): array
    {
        if (is_array($rawData)) {
            return $rawData;
        }

        $decoded = json_decode((string) ($rawData ?? ''), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function extractLoanTermMonths($source): ?int
    {
        if (is_array($source)) {
            $data = $source;
        } else {
            $data = $this->decodeWizardProgressData($source);
        }

        $termKeys = [
            'loan_term_months',
            'loan_term',
            'credit_term_months',
            'credit_term',
            'term_months',
            'term',
            'requested_term_months',
            'requested_term',
        ];

        foreach ($termKeys as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $value = (int) $data[$key];
            if ($value > 0) {
                return $value;
            }
        }

        if (isset($data['credit']) && is_array($data['credit'])) {
            foreach (['term_months', 'term', 'loan_term'] as $nestedKey) {
                if (!array_key_exists($nestedKey, $data['credit'])) {
                    continue;
                }

                $value = (int) $data['credit'][$nestedKey];
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }


    private function extractIbanValue(array $wizardProgress): ?string
    {
        $candidates = [
            $wizardProgress['iban'] ?? null,
            $wizardProgress['lead_iban'] ?? null,
            $wizardProgress['account_iban'] ?? null,
            $wizardProgress['bank_iban'] ?? null,
            is_array($wizardProgress['account'] ?? null) ? ($wizardProgress['account']['iban'] ?? null) : null,
            is_array($wizardProgress['payout'] ?? null) ? ($wizardProgress['payout']['iban'] ?? null) : null,
            is_array($wizardProgress['payment'] ?? null) ? ($wizardProgress['payment']['iban'] ?? null) : null,
            is_array($wizardProgress['transfer'] ?? null) ? ($wizardProgress['transfer']['iban'] ?? null) : null,
            is_array($wizardProgress['contract'] ?? null) ? ($wizardProgress['contract']['iban'] ?? null) : null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_string($candidate) && !is_numeric($candidate)) {
                continue;
            }

            $normalized = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string) $candidate));
            if (strlen($normalized) >= 10) {
                return $normalized;
            }
        }

        return null;
    }

    private function syncIbanFromWizardProgress(User $user, string $iban): void
    {
        if ($iban === '') {
            return;
        }

        DB::transaction(function () use ($user, $iban) {
            DB::table('ibans')
                ->where('user_id', $user->id)
                ->update([
                    'is_default' => false,
                    'updated_at' => now(),
                ]);

            $existingId = DB::table('ibans')
                ->where('user_id', $user->id)
                ->whereRaw('UPPER(iban) = ?', [$iban])
                ->value('id');

            $accountHolder = trim((string) $user->name . ' ' . (string) ($user->surname ?? ''));

            $payload = [
                'user_id' => $user->id,
                'iban' => $iban,
                'account_holder' => $accountHolder !== '' ? $accountHolder : null,
                'status' => 'pending',
                'is_default' => true,
                'updated_at' => now(),
            ];

            if ($existingId) {
                DB::table('ibans')->where('id', $existingId)->update($payload);
            } else {
                $payload['created_at'] = now();
                DB::table('ibans')->insert($payload);
            }
        });

        DB::table('leads')
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);

                $email = mb_strtolower(trim((string) ($user->email ?? '')));
                if ($email !== '') {
                    $query->orWhereRaw('LOWER(email) = ?', [$email]);
                }
            })
            ->update([
                'iban' => $iban,
                'updated_at' => now(),
            ]);
    }

    private function syncProfileFieldsFromWizardProgress(User $user, array $wizardProgress): void
    {
        $requestedAmount = $this->extractRequestedAmount($wizardProgress);
        $documentNumber = $this->extractDocumentNumber($wizardProgress);
        $documentType = $this->extractDocumentType($wizardProgress);

        $userUpdates = [];

        if ($requestedAmount !== null && ((float) ($user->requested_amount ?? 0)) <= 0) {
            $userUpdates['requested_amount'] = $requestedAmount;
        }

        if ($documentType !== null && trim((string) ($user->document_type ?? '')) === '') {
            $userUpdates['document_type'] = $documentType;
        }

        if ($documentNumber !== null && trim((string) ($user->document_number ?? '')) === '') {
            $userUpdates['document_number'] = $documentNumber;
        }

        if (!empty($userUpdates)) {
            $user->fill($userUpdates);
            $user->save();
        }

        $leadUpdates = [];

        if ($requestedAmount !== null) {
            $leadUpdates['requested_amount'] = $requestedAmount;
        }

        if ($documentNumber !== null) {
            $leadUpdates['document_number'] = $documentNumber;
        }

        if (!empty($leadUpdates)) {
            $leadUpdates['updated_at'] = now();

            DB::table('leads')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id);

                    $email = mb_strtolower(trim((string) ($user->email ?? '')));
                    if ($email !== '') {
                        $query->orWhereRaw('LOWER(email) = ?', [$email]);
                    }
                })
                ->update($leadUpdates);
        }
    }

    private function extractRequestedAmount(array $wizardProgress): ?float
    {
        $candidates = [
            $wizardProgress['requested_amount'] ?? null,
            $wizardProgress['amount'] ?? null,
            $wizardProgress['loan_amount'] ?? null,
            is_array($wizardProgress['credit'] ?? null) ? ($wizardProgress['credit']['amount'] ?? null) : null,
            is_array($wizardProgress['credit'] ?? null) ? ($wizardProgress['credit']['requested_amount'] ?? null) : null,
            is_array($wizardProgress['simulation'] ?? null) ? ($wizardProgress['simulation']['amount'] ?? null) : null,
            is_array($wizardProgress['loan'] ?? null) ? ($wizardProgress['loan']['amount'] ?? null) : null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_numeric($candidate)) {
                continue;
            }

            $value = (float) $candidate;
            if ($value > 0) {
                return $value;
            }
        }

        return null;
    }

    private function extractDocumentNumber(array $wizardProgress): ?string
    {
        $candidates = [
            $wizardProgress['document_number'] ?? null,
            $wizardProgress['doc_number'] ?? null,
            is_array($wizardProgress['document'] ?? null) ? ($wizardProgress['document']['number'] ?? null) : null,
            is_array($wizardProgress['identity'] ?? null) ? ($wizardProgress['identity']['number'] ?? null) : null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_scalar($candidate)) {
                continue;
            }

            $value = trim((string) $candidate);
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function extractDocumentType(array $wizardProgress): ?string
    {
        $candidates = [
            $wizardProgress['document_type'] ?? null,
            $wizardProgress['doc_type'] ?? null,
            is_array($wizardProgress['document'] ?? null) ? ($wizardProgress['document']['type'] ?? null) : null,
            is_array($wizardProgress['identity'] ?? null) ? ($wizardProgress['identity']['type'] ?? null) : null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_scalar($candidate)) {
                continue;
            }

            $value = trim((string) $candidate);
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }


    private function syncDocumentsStatusForUser(User $user, array $wizardProgress): void
    {
        $documentsVerified = $this->toBool($wizardProgress['documents_verified'] ?? null);
        if (!$documentsVerified) {
            $documentsVerified = $this->toBool($wizardProgress['documents_uploaded'] ?? null);
        }

        if (!$documentsVerified) {
            return;
        }

        $existing = DB::table('documents')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            DB::table('documents')
                ->where('id', $existing->id)
                ->update([
                    'status' => 'verified',
                    'verified_at' => $existing->verified_at ?: now(),
                    'updated_at' => now(),
                ]);

            return;
        }

        $type = trim((string) ($user->document_type ?? ''));
        if ($type === '') {
            $type = 'identity';
        }

        $filename = 'document_'.$user->id.'_verified.jpg';

        DB::table('documents')->insert([
            'user_id' => $user->id,
            'type' => $type,
            'filename' => $filename,
            'mime_type' => 'image/jpeg',
            'path' => 'virtual://cabinet/'.$user->id.'/'.$filename,
            'size' => 0,
            'status' => 'verified',
            'rejection_reason' => null,
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            return in_array($normalized, ['1', 'true', 'yes', 'on', 'verified', 'uploaded'], true);
        }

        return false;
    }

    private function normalizeAttachmentUrl(?string $url): ?string
    {
        $clean = trim((string) ($url ?? ''));
        if ($clean === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $clean) === 1) {
            $path = parse_url($clean, PHP_URL_PATH);
            if (is_string($path)) {
                $path = trim($path);
                if (str_starts_with($path, '/storage/')) {
                    return $path;
                }
            }
        }

        return $clean;
    }

    private function attachDefaultFdTag(Chat $chat): void
    {
        $fdTag = Tag::query()
            ->whereRaw('LOWER(name) = ?', ['fd'])
            ->first();

        if (!$fdTag) {
            return;
        }

        $chat->tags()->syncWithoutDetaching([$fdTag->id]);
    }
}
