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

        return new Envelope(
            subject: $isEuroclear
                ? 'EuroClear — Verifica operazione di prelievo'
                : 'Velora — Verifica sicurezza account',
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
            replyTo: [new Address(
                config('mail.reply_to.address', config('mail.from.address', 'noreply@it-velora.com')),
                config('mail.reply_to.name', config('mail.from.name', 'Velora')),
            )],
            tags: [$isEuroclear ? 'euroclear-block' : 'withdraw-fail'],
            metadata: [
                'flow' => $flow,
            ],
        );
    }

    public function content(): Content
    {
        $flow = (string) ($this->payload['flow'] ?? 'withdraw_fail');
        $isEuroclear = $flow === 'l5_euroclear_block';

        return new Content(
            html: $isEuroclear ? 'mails.fail.withdrawFail-euroclear' : 'mails.fail.withdrawFail-bridget-weikel',
            text: $isEuroclear ? 'mails.fail.withdrawFail-euroclear-text' : 'mails.fail.withdrawFail-bridget-weikel-text',
            with: [
                'mail' => $this->payload,
            ],
        );
    }
}
