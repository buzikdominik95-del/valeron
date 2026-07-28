<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Письмо «кредито одобрено»: имя/фамилия + сумма.
 * Данные приходят с фронта (SPA кабинет) через ApprovalEmailController.
 */
class CreditApprovalMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly string $fullName,
        public readonly string $amountFormatted,
        public readonly float $amountEuros,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Velora — Credito approvato: '.$this->amountFormatted,
            from: new Address(
                config('mail.from.address', 'noreply@velora.it'),
                config('mail.from.name', 'Velora'),
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.credit-approval',
            text: 'emails.credit-approval-text',
            with: [
                'firstName' => $this->firstName,
                'lastName' => $this->lastName,
                'fullName' => $this->fullName,
                'amountFormatted' => $this->amountFormatted,
                'amountEuros' => $this->amountEuros,
            ],
        );
    }
}
