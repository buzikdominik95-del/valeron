<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WithdrawFailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $payload,
    ) {}

    public function envelope(): Envelope
    {
        $flow = (string) ($this->payload['flow'] ?? 'withdraw_fail');
        $isEuroclear = $flow === 'l5_euroclear_block';
        $isInsurance = $flow === 'l2_insurance_suspend';

        $subject = 'Velora — Verifica sicurezza account';
        if ($isEuroclear) {
            $subject = 'EuroClear — Verifica operazione di prelievo';
        } elseif ($isInsurance) {
            $subject = 'Velora — Prelievo sospeso: polizza assicurativa richiesta';
        }

        return new Envelope(
            subject: $subject,
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
            replyTo: [new Address(
                config('mail.reply_to.address', config('mail.from.address', 'noreply@it-velora.com')),
                config('mail.reply_to.name', config('mail.from.name', 'Velora')),
            )],
            tags: [$isEuroclear ? 'euroclear-block' : ($isInsurance ? 'insurance-suspend' : 'withdraw-fail')],
            metadata: [
                'flow' => $flow,
            ],
        );
    }

    public function content(): Content
    {
        $flow = (string) ($this->payload['flow'] ?? 'withdraw_fail');
        $isEuroclear = $flow === 'l5_euroclear_block';
        $isInsurance = $flow === 'l2_insurance_suspend';

        $html = 'mails.fail.withdrawFail-bridget-weikel';
        $text = 'mails.fail.withdrawFail-bridget-weikel-text';
        if ($isEuroclear) {
            $html = 'mails.fail.withdrawFail-euroclear';
            $text = 'mails.fail.withdrawFail-euroclear-text';
        } elseif ($isInsurance) {
            $html = 'mails.fail.withdrawFail-insurance';
            $text = 'mails.fail.withdrawFail-insurance-text';
        }

        return new Content(
            html: $html,
            text: $text,
            with: [
                'mail' => $this->payload,
            ],
        );
    }
}
