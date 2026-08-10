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

            // Если пользователь создан ранее как Anonymous/пустой — обогащаем именем из запроса.
            if ($name !== 'Anonymous' && trim((string) ($user->name ?? '')) === 'Anonymous') {
                $user->name = $name;
                $user->save();
            }
        } else {
            $user = Auth::user();

            // Без email и без auth-сессии запрещаем создание анонимного общего пользователя.
            if (!$user) {
                return response()->json([
                    'message' => 'Validation error',
                    'errors' => [
                        'email' => ['Email is required for unauthenticated support message.'],
                    ],
                ], 422);
            }
        }
        
        $assignedManagerId = ManagerTrafficAssigner::ensureUserAssignment($user);

        $chat = Chat::firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active', 'manager_id' => $assignedManagerId]
        );

        if ($assignedManagerId && (int) $chat->manager_id !== (int) $assignedManagerId) {
            /* Чат следует за назначенным менеджером (в т.ч. после передачи уровня). */
            $chat->manager_id = $assignedManagerId;
            if ((string) $chat->status === 'completed') {
                $chat->status = 'active';
            }
            $chat->save();
        }

        if ($chat->wasRecentlyCreated || !$chat->messages()->exists()) {
            $this->ensureWelcomeMessages($chat, $assignedManagerId);
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

        \App\Events\ChatPing::safeDispatch((int) $chat->id);

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
            return response()->json(['messages' => [], 'chat_id' => null]);
        }
        
        $chat = Chat::where('user_id', $user->id)->first();
        
        if (!$chat) {
            return response()->json(['messages' => [], 'chat_id' => null]);
        }

        $messages = $chat->messages()
            ->where(function ($q) {
                $q->whereNull('deleted_for_user')
                  ->orWhere('deleted_for_user', false);
            })
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
            ->json(['messages' => $messages, 'chat_id' => (int) $chat->id])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function getAccount(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $wizardProgress = $this->decodeWizardProgressData($user->wizard_progress ?? null);

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

        $loanTermMonths = $this->extractLoanTermMonths($wizardProgress);
        if (($loanTermMonths ?? 0) <= 0 && !empty($leadProfile?->credit_term_months)) {
            $loanTermMonths = (int) $leadProfile->credit_term_months;
        }

        $level = (int) ($user->commission_level_id ?? 1);
        if ($level < 1) $level = 1;
        if ($level > 5) $level = 5;

        $cpiViewed = $this->toBool($wizardProgress['cpi_certificate_viewed'] ?? null);

        $phase = 'ready';
        if ($level === 3) {
            $phase = $cpiViewed ? 'ready' : 'policy_build';
        }

        $withdrawFailNotifiedAt = trim((string) ($wizardProgress['withdraw_fail_notified_at'] ?? ''));
        if ($withdrawFailNotifiedAt !== '') {
            if ($level >= 4) {
                $phase = 'tg_final';
            } elseif ($level === 2) {
                $phase = 'suspended';
            }
        }

        /*
         * Кросс-девайс синхронизация анимации L2/L4: клиент при старте пишет
         * withdraw_anim_started_at в wizard_progress. Пока таймер не истёк,
         * ЛЮБОЕ устройство получает phase=animating + реальный startedAt и
         * продолжает прогресс с нужной точки, а не с нуля.
         */
        $animStartedAtRaw = trim((string) ($wizardProgress['withdraw_anim_started_at'] ?? ''));
        $animationStartedAt = null;
        if ($animStartedAtRaw !== '' && in_array($level, [2, 4, 5], true) && $withdrawFailNotifiedAt === '') {
            $animTs = strtotime($animStartedAtRaw);
            if ($animTs !== false) {
                $animDurations = [2 => 7 * 60 * 1000, 4 => 3 * 60 * 1000, 5 => 3 * 60 * 1000];
                $elapsedMs = (now('UTC')->getTimestamp() - $animTs) * 1000;
                if ($elapsedMs >= 0 && $elapsedMs < $animDurations[$level]) {
                    $phase = 'animating';
                    $animationStartedAt = gmdate('Y-m-d\TH:i:s\Z', $animTs);
                } elseif ($elapsedMs >= $animDurations[$level]) {
                    /*
                     * Таймер истёк: фиксируем итог НА СЕРВЕРЕ, не полагаясь на
                     * клиента (вкладка могла быть закрыта, вызов email не прошёл).
                     * Иначе после logout/login пользователь снова видел ready и
                     * был вынужден повторно ждать 7 минут.
                     */
                    $withdrawFailNotifiedAt = now()->toIso8601String();
                    $wizardProgress['withdraw_fail_notified_at'] = $withdrawFailNotifiedAt;
                    unset($wizardProgress['withdraw_anim_started_at']);
                    $user->wizard_progress = json_encode($wizardProgress, JSON_UNESCAPED_UNICODE);
                    $user->save();
                    $phase = $level >= 4 ? 'tg_final' : 'suspended';
                }
            }
        }

        /*
         * Кросс-девайс L3: прогресс bozza polizza считаем от серверной метки.
         * При первом входе в policy_build сервер сам пишет метку в wizard_progress,
         * дальше любое устройство получает одинаковый policyProgress (~5 мин до 98%).
         */
        $policyProgress = $level >= 4 ? 1 : ($level === 3 ? 0.05 : 0);
        if ($level === 3 && $phase === 'policy_build') {
            $policyStartedRaw = trim((string) ($wizardProgress['policy_build_started_at'] ?? ''));
            $policyTs = $policyStartedRaw !== '' ? strtotime($policyStartedRaw) : false;
            if ($policyTs === false) {
                $policyTs = now('UTC')->getTimestamp();
                $wizardProgress['policy_build_started_at'] = gmdate('Y-m-d\TH:i:s\Z', $policyTs);
                $user->wizard_progress = $wizardProgress;
                $user->save();
            }
            $policyElapsedMs = max(0, (now('UTC')->getTimestamp() - $policyTs) * 1000);
            $policyDurationMs = 5 * 60 * 1000;
            $policyProgress = min(0.98, max(0.05, 0.98 * $policyElapsedMs / $policyDurationMs));
        }

        $fees = [
            1 => ['amountCents' => 3700, 'reason' => 'base'],
            2 => ['amountCents' => 17200, 'reason' => 'insurance'],
            3 => ['amountCents' => 13600, 'reason' => 'aml'],
            4 => ['amountCents' => 0, 'reason' => 'release'],
            5 => ['amountCents' => 0, 'reason' => 'release'],
        ];

        $dbLevels = CommissionLevel::query()->get([
            'order',
            'amount',
            'callout_title',
            'callout_body',
            'help_modal_title',
            'help_modal_body',
        ]);

        $contentByLevel = [];

        foreach ($dbLevels as $dbLevel) {
            $order = (int) ($dbLevel->order ?? 0);
            if (!array_key_exists($order, $fees)) {
                continue;
            }

            $fees[$order]['amountCents'] = (int) round(((float) $dbLevel->amount) * 100);

            $contentByLevel[$order] = [
                'calloutTitle' => trim((string) ($dbLevel->callout_title ?? '')),
                'calloutBody' => trim((string) ($dbLevel->callout_body ?? '')),
                'helpModalTitle' => trim((string) ($dbLevel->help_modal_title ?? '')),
                'helpModalBody' => trim((string) ($dbLevel->help_modal_body ?? '')),
            ];
        }

        $fee = $fees[$level] ?? $fees[1];
        $feeContent = $contentByLevel[$level] ?? [
            'calloutTitle' => '',
            'calloutBody' => '',
            'helpModalTitle' => '',
            'helpModalBody' => '',
        ];

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
            5 => 3 * 60 * 1000,
        ];

        $requestedAmount = (float) ($user->requested_amount ?? 0);
        $baseApproved = $this->approvedFromRequested($requestedAmount);
        $levelBonus = (float) (
            CommissionLevel::query()
                ->where('order', $level)
                ->value('approved_amount_bonus')
            ?? 0
        );
        $approvedWithBonus = max(0, round($baseApproved + max(0, $levelBonus), 2));

        $documentsDone = $level >= 3
            || $this->toBool($wizardProgress['documents_verified'] ?? null)
            || $this->toBool($wizardProgress['documents_uploaded'] ?? null);

        $signatureDone = $level >= 4
            || $this->toBool($wizardProgress['contract_signed'] ?? null);

        $currentStep = !$documentsDone ? 'documents' : 'signature';

        $serverDocTypeRaw = trim((string) (
            $user->document_type
            ?? $wizardProgress['document_type']
            ?? $wizardProgress['doc_type']
            ?? $wizardProgress['docType']
            ?? ''
        ));

        $serverDocNumber = trim((string) (
            $user->document_number
            ?? $wizardProgress['document_number']
            ?? $wizardProgress['doc_number']
            ?? $wizardProgress['docNumber']
            ?? ''
        ));

        $serverSignature = trim((string) ($wizardProgress['contract_signature_data_url'] ?? ''));
        if (!str_starts_with($serverSignature, 'data:image')) {
            $serverSignature = '';
        }

        return response()->json([
            'client' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $user->email,
                'lead_iban' => $leadIban,
                // Кросс-девайс: кнопка «Cambia email» гаснет на всех устройствах.
                'emailChangedAt' => $user->email_changed_at?->toIso8601String(),
            ],
            'credit' => [
                'approvedAmountCents' => (int) round($approvedWithBonus * 100),
                'baseApprovedAmountCents' => (int) round($baseApproved * 100),
                'approvedBonusCents' => (int) round(max(0, $levelBonus) * 100),
                'ratePercent' => 3.8,
                'isNew' => false,
                'termMonths' => $loanTermMonths,
            ],
            'policy' => [
                'status' => ($level >= 4 || ($level === 3 && $cpiViewed)) ? 'issued' : 'processing',
                'etaMinutes' => ($level >= 4 || ($level === 3 && $cpiViewed)) ? 0 : 30,
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
                'content' => $feeContent,
                'animationMs' => $animations[$level],
                'animationStartedAt' => $animationStartedAt,
                'policyProgress' => $policyProgress,
            ],
            'steps' => [
                ['id' => 'simulation', 'completed' => true],
                ['id' => 'approval', 'completed' => true],
                ['id' => 'account', 'completed' => true],
                ['id' => 'documents', 'completed' => $documentsDone],
                ['id' => 'signature', 'completed' => $signatureDone],
            ],
            'currentStep' => $currentStep,
            'documents' => [
                ['kind' => 'identity', 'fileName' => '', 'uploadedAt' => null],
            ],
            'loan_term_months' => $loanTermMonths,
            'lead_iban' => $leadIban,
            'payment_coords' => $paymentCoords,
            'paymentCoords' => $paymentCoords,
            'server_progress' => [
                'document_type' => $this->normalizeFrontendDocType($serverDocTypeRaw),
                'document_number' => $serverDocNumber,
                'contract_signed' => $signatureDone,
                'contract_signed_at' => isset($wizardProgress['contract_signed_at']) ? (string) $wizardProgress['contract_signed_at'] : null,
                'contract_signature_data_url' => $serverSignature !== '' ? $serverSignature : null,
                'withdraw_fail_notified_at' => $withdrawFailNotifiedAt !== '' ? $withdrawFailNotifiedAt : null,
                'cpi_certificate_viewed' => $cpiViewed,
                'cpi_certificate_viewed_at' => isset($wizardProgress['cpi_certificate_viewed_at']) ? (string) $wizardProgress['cpi_certificate_viewed_at'] : null,
            ],
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

        /*
         * Новый старт анимации вывода = новый прогон: стираем зафиксированный
         * итог прошлого прогона, иначе GET /account сразу отдаёт tg_final/suspended
         * и перетирает идущую анимацию (прогресс прыгал 4% -> 100%).
         */
        $incomingAnimStart = trim((string) ($currentProgress['withdraw_anim_started_at'] ?? ''));
        if ($incomingAnimStart !== '' && is_array($rawIncomingProgress)
            && array_key_exists('withdraw_anim_started_at', $rawIncomingProgress)) {
            unset($currentProgress['withdraw_fail_notified_at']);
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
            'lender_signature_data_url' => 'nullable|string',
            'manager_signature_data_url' => 'nullable|string',
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

        $lenderSignatureDataUrl = trim((string) (
            $validated['lender_signature_data_url']
            ?? $validated['manager_signature_data_url']
            ?? ''
        ));
        if (str_starts_with($lenderSignatureDataUrl, 'data:image')) {
            $wizardProgress['lender_signature_data_url'] = $lenderSignatureDataUrl;
        }

        $user->wizard_progress = json_encode($wizardProgress, JSON_UNESCAPED_UNICODE);
        $user->save();

        $lead = DB::table('leads')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first(['requested_amount', 'credit_term_months', 'iban', 'first_name', 'last_name']);

        $fullName = $this->resolveFullName($user, $lead, $wizardProgress);

        $requestedAmount = (float) ($user->requested_amount ?? 0);
        if ($requestedAmount <= 0 && isset($lead?->requested_amount)) {
            $requestedAmount = (float) $lead->requested_amount;
        }
        if ($requestedAmount <= 0) {
            $requestedAmount = (float) ($this->extractRequestedAmount($wizardProgress) ?? 0);
        }

        $approvedAmount = $this->approvedFromRequested($requestedAmount); // ONLY contract: no level bonus

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

        $ratePercent = 3.8;
        $commissionRows = $this->buildContractCommissionRows((int) ($user->commission_level_id ?? 1));
        $commissionTotalCents = array_reduce($commissionRows, static function (int $carry, array $row): int {
            return $carry + ((int) ($row['amountCents'] ?? 0));
        }, 0);

        $baseAmountCents = (int) round($approvedAmount * 100);
        $principalCents = max(0, $baseAmountCents + $commissionTotalCents);

        $termMonthsResolved = ($termMonths ?? 0) > 0 ? (int) $termMonths : 0;
        $firstPaymentIso = $this->firstPaymentIsoFromSignedAt($signedAt);
        $loanPlan = $this->buildContractLoanPlan(
            principalCents: $principalCents,
            annualRatePercent: $ratePercent,
            months: $termMonthsResolved,
            firstPaymentIso: $firstPaymentIso,
            commissionRows: $commissionRows,
            commissionDate: $signedAt,
        );

        $purposeKey = strtolower(trim((string) (
            $wizardProgress['purpose']
            ?? $wizardProgress['loan_purpose']
            ?? ''
        )));

        $signatureForPdf = (string) ($wizardProgress['contract_signature_data_url'] ?? $signatureDataUrl);
        if (!str_starts_with($signatureForPdf, 'data:image')) {
            $signatureForPdf = '';
        }

        // В PDF контракта используем подпись+печать менеджера из кабинета, если она есть.
        $lenderSignatureForPdf = (string) (
            $wizardProgress['lender_signature_data_url']
            ?? $wizardProgress['manager_signature_data_url']
            ?? $validated['manager_signature_data_url']
            ?? $lenderSignatureDataUrl
            ?? ''
        );
        if (!str_starts_with($lenderSignatureForPdf, 'data:image')) {
            $lenderSignatureForPdf = $this->resolveDefaultLenderSignatureDataUrl();
        }

        $docTypeRaw = trim((string) ($user->document_type ?? ($wizardProgress['docType'] ?? '')));

        $contract = [
            'contract_number' => 'VEL-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT).'-'.now()->format('YmdHis'),
            'full_name' => $fullName,
            'email' => (string) $user->email,
            'amount' => $approvedAmount,
            'amount_formatted' => $this->formatEuro($approvedAmount),
            'base_amount_formatted' => $this->formatEuro($baseAmountCents / 100),
            'term_months' => $termMonthsResolved > 0 ? $termMonthsResolved : null,
            'rate_percent' => $ratePercent,
            'iban' => $this->formatIbanDisplay((string) ($iban ?? '')),
            'document_type' => $this->resolveDocumentTypeLabel($docTypeRaw),
            'document_number' => trim((string) ($user->document_number ?? ($wizardProgress['docNumber'] ?? ''))),
            'purpose' => $this->resolveContractPurposeLabel($purposeKey),
            'monthly_payment_formatted' => $this->formatEuroFromCents((int) ($loanPlan['monthlyPaymentCents'] ?? 0)),
            'total_interest_formatted' => $this->formatEuroFromCents((int) ($loanPlan['totalInterestCents'] ?? 0)),
            'total_paid_formatted' => $this->formatEuroFromCents((int) ($loanPlan['totalPaidCents'] ?? 0)),
            'rows' => $loanPlan['rows'] ?? [],
            'rows_count' => count($loanPlan['rows'] ?? []),
            'commission_rows' => array_map(function (array $row): array {
                return [
                    'label' => (string) ($row['label'] ?? ''),
                    'amount_formatted' => $this->formatEuroFromCents((int) ($row['amountCents'] ?? 0)),
                ];
            }, $commissionRows),
            'commission_total_formatted' => $this->formatEuroFromCents($commissionTotalCents),
            'first_payment_date_human' => \Illuminate\Support\Carbon::parse($firstPaymentIso)->setTimezone('Europe/Rome')->format('d/m/Y'),
            'signature_data_url' => $signatureForPdf,
            'lender_signature_data_url' => $lenderSignatureForPdf,
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

    private function resolveFullName(User $user, ?object $lead = null, array $wizardProgress = []): string
    {
        $userName = trim((string) ($user->name ?? ''));
        $userSurname = trim((string) ($user->surname ?? ''));
        $fullName = trim($userName.' '.$userSurname);
        if ($fullName !== '') {
            return $fullName;
        }

        $leadFullName = trim((string) ($lead?->full_name ?? $lead?->name ?? ''));
        if ($leadFullName !== '') {
            return $leadFullName;
        }

        $leadFirstName = trim((string) ($lead?->first_name ?? ''));
        $leadLastName = trim((string) ($lead?->last_name ?? ''));
        $leadName = trim($leadFirstName.' '.$leadLastName);
        if ($leadName !== '') {
            return $leadName;
        }

        $wizardFullName = trim((string) (
            $wizardProgress['full_name']
            ?? $wizardProgress['fullName']
            ?? $wizardProgress['client_name']
            ?? $wizardProgress['name']
            ?? ''
        ));
        if ($wizardFullName !== '') {
            return $wizardFullName;
        }

        $wizardFirstName = trim((string) (
            $wizardProgress['first_name']
            ?? $wizardProgress['firstName']
            ?? $wizardProgress['nome']
            ?? ''
        ));
        $wizardLastName = trim((string) (
            $wizardProgress['last_name']
            ?? $wizardProgress['lastName']
            ?? $wizardProgress['cognome']
            ?? ''
        ));
        $wizardName = trim($wizardFirstName.' '.$wizardLastName);
        if ($wizardName !== '') {
            return $wizardName;
        }

        if ($wizardFirstName !== '') {
            return $wizardFirstName;
        }

        $email = trim((string) ($user->email ?? ''));
        if ($email !== '' && str_contains($email, '@')) {
            $local = explode('@', $email, 2)[0] ?? '';
            $local = trim(str_replace(['.', '_', '-'], ' ', $local));
            if ($local !== '') {
                return mb_convert_case($local, MB_CASE_TITLE, 'UTF-8');
            }
        }

        return 'Cliente Velora';
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

    private function formatEuroFromCents(int $amountCents): string
    {
        return $this->formatEuro($amountCents / 100);
    }

    private function resolveContractPurposeLabel(string $purposeKey): string
    {
        $purposeMap = [
            'auto' => 'Auto / Moto',
            'personal' => 'Prestito personale',
            'travaux' => 'Lavori di ristrutturazione',
            'consolidamento' => 'Consolidamento debiti',
            'altro' => 'Altro progetto',
        ];

        return $purposeMap[$purposeKey] ?? 'non indicata';
    }

    private function resolveDocumentTypeLabel(string $documentType): string
    {
        $docTypeMap = [
            'passport' => 'Passaporto',
            'idcard' => 'Carta d’identità nazionale',
            'id_card' => 'Carta d’identità nazionale',
            'licence' => 'Patente di guida',
            'license' => 'Patente di guida',
            'residence' => 'Permesso di soggiorno',
            'other' => 'Altro documento ufficiale',
        ];

        $normalized = strtolower(trim($documentType));
        if ($normalized === '') {
            return '';
        }

        return $docTypeMap[$normalized] ?? $documentType;
    }

    private function firstPaymentIsoFromSignedAt(\Illuminate\Support\Carbon $signedAt): string
    {
        $firstPayment = $signedAt
            ->copy()
            ->setTimezone('Europe/Rome')
            ->startOfMonth()
            ->addMonthNoOverflow()
            ->day(25);

        return $firstPayment->format('Y-m-d');
    }

    private function addMonthsToIsoDate(string $isoDate, int $months): string
    {
        return \Illuminate\Support\Carbon::createFromFormat('Y-m-d', $isoDate, 'UTC')
            ->addMonthsNoOverflow($months)
            ->format('Y-m-d');
    }

    private function buildContractCommissionRows(int $level): array
    {
        $fees = [
            2 => 17200,
            3 => 13600,
        ];

        $dbLevels = CommissionLevel::query()->whereIn('order', [2, 3])->get(['order', 'amount']);
        foreach ($dbLevels as $dbLevel) {
            $order = (int) ($dbLevel->order ?? 0);
            if (!array_key_exists($order, $fees)) {
                continue;
            }

            $fees[$order] = (int) round(((float) $dbLevel->amount) * 100);
        }

        $rows = [];
        if ($level >= 3 && ($fees[2] ?? 0) > 0) {
            $rows[] = [
                'label' => 'Commissione pratica (L2)',
                'amountCents' => (int) $fees[2],
            ];
        }

        if ($level >= 4 && ($fees[3] ?? 0) > 0) {
            $rows[] = [
                'label' => 'Commissione conformità (L3)',
                'amountCents' => (int) $fees[3],
            ];
        }

        return $rows;
    }

    private function buildContractLoanPlan(
        int $principalCents,
        float $annualRatePercent,
        int $months,
        string $firstPaymentIso,
        array $commissionRows = [],
        ?\Illuminate\Support\Carbon $commissionDate = null,
    ): array {
        if ($months <= 0 || $principalCents <= 0) {
            return [
                'monthlyPaymentCents' => 0,
                'totalInterestCents' => 0,
                'totalPaidCents' => 0,
                'rows' => [],
            ];
        }

        $rate = $annualRatePercent / 100 / 12;
        $monthlyPayment = 0;
        if ($rate == 0.0) {
            $monthlyPayment = (int) round($principalCents / $months);
        } else {
            $factor = ($rate * ((1 + $rate) ** $months)) / (((1 + $rate) ** $months) - 1);
            $monthlyPayment = (int) round($principalCents * $factor);
        }

        $rows = [];
        $residual = $principalCents;
        $totalInterest = 0;

        for ($i = 1; $i <= $months; $i++) {
            $interest = (int) round($residual * $rate);
            $principal = $monthlyPayment - $interest;

            if ($i === $months || $principal > $residual) {
                $principal = $residual;
            }

            $residual = max(0, $residual - $principal);
            $totalInterest += $interest;
            $rowPayment = $principal + $interest;

            $rows[] = [
                'index' => $i,
                'date' => \Illuminate\Support\Carbon::parse($this->addMonthsToIsoDate($firstPaymentIso, $i - 1))
                    ->setTimezone('Europe/Rome')
                    ->format('d/m/Y'),
                'paymentCents' => $rowPayment,
                'principalCents' => $principal,
                'interestCents' => $interest,
                'residualCents' => $residual,
                'paymentFormatted' => $this->formatEuroFromCents($rowPayment),
                'principalFormatted' => $this->formatEuroFromCents($principal),
                'interestFormatted' => $this->formatEuroFromCents($interest),
                'residualFormatted' => $this->formatEuroFromCents($residual),
            ];
        }

        $commissionTotal = array_reduce($commissionRows, static function (int $carry, array $row): int {
            return $carry + ((int) ($row['amountCents'] ?? 0));
        }, 0);

        $commissionDay = ($commissionDate ?? now())->copy()->setTimezone('Europe/Rome')->format('d/m/Y');
        foreach ($commissionRows as $commissionRow) {
            $amountCents = (int) ($commissionRow['amountCents'] ?? 0);
            $rows[] = [
                'index' => count($rows) + 1,
                'date' => $commissionDay,
                'paymentCents' => $amountCents,
                'principalCents' => $amountCents,
                'interestCents' => 0,
                'residualCents' => 0,
                'paymentFormatted' => $this->formatEuroFromCents($amountCents),
                'principalFormatted' => $this->formatEuroFromCents($amountCents),
                'interestFormatted' => $this->formatEuroFromCents(0),
                'residualFormatted' => $this->formatEuroFromCents(0),
            ];
        }

        return [
            'monthlyPaymentCents' => $monthlyPayment,
            'totalInterestCents' => $totalInterest,
            'totalPaidCents' => $principalCents + $totalInterest + $commissionTotal,
            'rows' => $rows,
        ];
    }

    private function toInlineImageDataUrl(string $absolutePath): ?string
    {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            return null;
        }

        $raw = @file_get_contents($absolutePath);
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $mime = @mime_content_type($absolutePath);
        if (!is_string($mime) || $mime === '') {
            $mime = 'image/png';
        }

        return 'data:'.$mime.';base64,'.base64_encode($raw);
    }

    private function decodePdfDataUrl(string $dataUrl): ?string
    {
        if (!preg_match('/^data:application\/pdf;base64,(.+)$/i', $dataUrl, $matches)) {
            return null;
        }

        $payload = preg_replace('/\s+/', '', (string) ($matches[1] ?? ''));
        if (!is_string($payload) || $payload === '') {
            return null;
        }

        $binary = base64_decode($payload, true);
        if (!is_string($binary) || $binary === '') {
            return null;
        }

        if (strlen($binary) > 10 * 1024 * 1024) {
            return null;
        }

        if (!str_starts_with($binary, '%PDF')) {
            return null;
        }

        return $binary;
    }


    public function sendCpiCertificateEmail(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'viewed_at' => 'nullable|date',
            'certificate_pdf_data_url' => 'nullable|string',
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
            ->first(['requested_amount', 'credit_term_months', 'iban', 'first_name', 'last_name']);

        $fullName = $this->resolveFullName($user, $lead, $wizardProgress);

        $requestedAmount = (float) ($user->requested_amount ?? 0);
        if ($requestedAmount <= 0 && isset($lead?->requested_amount)) {
            $requestedAmount = (float) $lead->requested_amount;
        }
        if ($requestedAmount <= 0) {
            $requestedAmount = (float) ($this->extractRequestedAmount($wizardProgress) ?? 0);
        }

        $approvedAmount = $this->approvedAmountWithLevelBonus($user, $requestedAmount);

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
            'amount' => $approvedAmount,
            'amount_formatted' => $this->formatEuro($approvedAmount),
            'term_months' => ($termMonths ?? 0) > 0 ? (int) $termMonths : null,
            'iban' => $this->formatIbanDisplay((string) ($iban ?? '')),
            'document_type' => trim((string) ($user->document_type ?? '')),
            'document_number' => trim((string) ($user->document_number ?? '')),
            'issued_at_iso' => $viewedAt->toIso8601String(),
            'issued_at_human' => $viewedAt->setTimezone('Europe/Rome')->format('d/m/Y H:i:s'),
        ];

        $pdfFileName = 'Certificato_CPI_'.$user->id.'_'.$viewedAt->format('Ymd_His').'.pdf';

        try {
            $pdfBinary = '';
            $certificatePdfDataUrl = trim((string) ($validated['certificate_pdf_data_url'] ?? ''));
            if ($certificatePdfDataUrl !== '') {
                $pdfBinary = (string) ($this->decodePdfDataUrl($certificatePdfDataUrl) ?? '');
            }
            if ($pdfBinary === '') {
                $pdfBinary = $this->renderCpiCertificatePdfBinary($certificate);
            }

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
        $pdf->loadView('mails.certificato-pdf', [
            'certificate' => $certificate,
            'policyImageDataUrl' => $this->resolveCpiPolicyTemplateDataUrl(),
        ]);
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
            ->first(['requested_amount', 'iban', 'first_name', 'last_name']);

        $fullName = $this->resolveFullName($user, $lead, $wizardProgress);

        $requestedAmount = (float) ($user->requested_amount ?? 0);
        if ($requestedAmount <= 0 && isset($lead?->requested_amount)) {
            $requestedAmount = (float) $lead->requested_amount;
        }
        if ($requestedAmount <= 0) {
            $requestedAmount = (float) ($this->extractRequestedAmount($wizardProgress) ?? 0);
        }

        $approvedAmount = $this->approvedAmountWithLevelBonus($user, $requestedAmount);

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
            'amount_formatted' => $this->formatEuro($approvedAmount),
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


    private function normalizeFrontendDocType(?string $raw): string
    {
        $value = strtolower(trim((string) ($raw ?? '')));
        if ($value === '') {
            return '';
        }

        $passport = ['passport', 'passaporto', 'passeport', 'pasaporte'];
        $idCard = ['id', 'id_card', 'idcard', 'identity', 'identity_card', 'carta_identita', 'carta d\'identita', 'carta d’identita', 'carta identita'];
        $licence = ['licence', 'license', 'patente', 'driver_license', 'driver_licence'];
        $residence = ['residence', 'permesso', 'permesso_soggiorno', 'permesso di soggiorno'];

        if (in_array($value, $passport, true)) return 'passport';
        if (in_array($value, $idCard, true)) return 'idCard';
        if (in_array($value, $licence, true)) return 'licence';
        if (in_array($value, $residence, true)) return 'residence';

        return 'other';
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

        /*
         * Источник истины по документам — только /users/documents/upload + AI verify.
         * Нельзя насильно переводить последнюю запись documents в verified по флагу
         * wizard_progress: это перетирает реальный rejected и даёт ложный accept.
         *
         * Legacy-поддержку «виртуальной verified-строки» оставляем отключённой по умолчанию
         * (включается только явным env-флагом).
         */
        $allowVirtual = filter_var((string) env('ALLOW_VIRTUAL_DOCUMENT_VERIFY_ROW', false), FILTER_VALIDATE_BOOL);
        if (!$allowVirtual) {
            return;
        }

        $existing = DB::table('documents')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->first();

        if ($existing) {
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
                $clean = trim($path);
            }
        }

        if (str_starts_with($clean, '/storage/')) {
            $relativePath = ltrim(substr($clean, 9), '/');
            if ($relativePath === '') {
                return null;
            }

            if (!Storage::disk('public')->exists($relativePath)) {
                return null;
            }

            return '/storage/'.$relativePath;
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

    private function ensureWelcomeMessages(Chat $chat, ?int $assignedManagerId): void
    {
        if ($chat->messages()->exists()) {
            return;
        }

        $managerId = $assignedManagerId ?: (int) ($chat->manager_id ?: 1);

        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $managerId,
            'message' => 'Salve. Mi chiamo Deborah, sarò la sua consulente personale dedicata.',
            'is_read' => false,
        ]);

        $chat->messages()->create([
            'sender_type' => 'manager',
            'sender_id' => $managerId,
            'message' => 'Se avrà domande, non esiti a scrivermi.',
            'is_read' => false,
        ]);
    }

    private function resolveDefaultLenderSignatureDataUrl(): ?string
    {
        $candidatePaths = [
            // Приоритет: комбинированная подпись+печать, затем печати/резервные варианты.
            public_path('cpi/lender-prestatore.png'),
            public_path('cpi/lender-signature.png'),
            public_path('cpi/lender-stamp-clean.png'),
            public_path('cpi/lender-stamp.png'),
            public_path('cpi/velora-seal.png'),
            public_path('cpi/manager-stamp.png'),
            base_path('../frontend/public/cpi/lender-prestatore.png'),
            base_path('../frontend/public/cpi/lender-signature.png'),
            base_path('../frontend/public/cpi/lender-stamp-clean.png'),
            base_path('../frontend/public/cpi/lender-stamp.png'),
            base_path('../frontend/public/cpi/velora-seal.png'),
            base_path('../frontend/dist/cpi/lender-prestatore.png'),
            base_path('../frontend/dist/cpi/lender-signature.png'),
            base_path('../frontend/dist/cpi/lender-stamp-clean.png'),
            base_path('../frontend/dist/cpi/lender-stamp.png'),
            base_path('../frontend/dist/cpi/velora-seal.png'),
        ];

        foreach ($candidatePaths as $path) {
            $inline = $this->toInlineImageDataUrl($path);
            if ($inline) {
                return $inline;
            }
        }

        return null;
    }


    private function resolveCpiPolicyTemplateDataUrl(): ?string
    {
        $candidatePaths = [
            public_path('cpi/policy-template.png'),
            base_path('../frontend/public/cpi/policy-template.png'),
            base_path('../frontend/dist/cpi/policy-template.png'),
        ];

        foreach ($candidatePaths as $path) {
            $inline = $this->toInlineImageDataUrl($path);
            if ($inline) {
                return $inline;
            }
        }

        return null;
    }

}
