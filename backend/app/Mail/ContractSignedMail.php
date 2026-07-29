<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContractSignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $contract,
        public readonly string $pdfBinary,
        public readonly string $pdfFileName,
    ) {}

    public function envelope(): Envelope
    {
        $subjectNo = trim((string) ($this->contract['contract_number'] ?? ''));

        return new Envelope(
            subject: $subjectNo !== ''
                ? 'Velora — Contratto firmato · '.$subjectNo
                : 'Velora — Contratto firmato',
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mails.contract',
            text: 'mails.contract-text',
            with: [
                'contract' => $this->contract,
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBinary, $this->pdfFileName)
                ->withMime('application/pdf'),
        ];
    }
}
