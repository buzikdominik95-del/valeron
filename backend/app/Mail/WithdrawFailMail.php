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
        return new Envelope(
            subject: 'Velora — Rifiuto prelievo',
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mails.fail.withdrawFail-bridget-weikel',
            text: 'mails.fail.withdrawFail-bridget-weikel-text',
            with: [
                'mail' => $this->payload,
            ],
        );
    }
}
