<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeRegistrationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $fullName,
        public readonly string $amountFormatted,
        public readonly float $amountEuros,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Velora — Credito approvato',
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
        );
    }

    public function content(): Content
    {
        $cabinetUrl = rtrim((string) config('app.frontend_url', config('app.url', 'https://it-velora.com')), '/')
            .'/?view=cabinet&tab=home';

        return new Content(
            html: 'emails.welcome-registration',
            text: 'emails.welcome-registration-text',
            with: [
                'fullName' => $this->fullName,
                'amountFormatted' => $this->amountFormatted,
                'amountEuros' => $this->amountEuros,
                'cabinetUrl' => $cabinetUrl,
            ],
        );
    }
}
