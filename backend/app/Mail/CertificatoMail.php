<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CertificatoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $certificate,
        public readonly string $pdfBinary,
        public readonly string $pdfFileName,
    ) {}

    public function envelope(): Envelope
    {
        $subjectNo = trim((string) ($this->certificate['certificate_number'] ?? ''));

        return new Envelope(
            subject: $subjectNo !== ''
                ? 'Velora — Certificato CPI · '.$subjectNo
                : 'Velora — Certificato CPI',
            from: new Address(
                config('mail.from.address', 'noreply@it-velora.com'),
                config('mail.from.name', 'Velora'),
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mails.certificato',
            text: 'mails.certificato-text',
            with: [
                'certificate' => $this->certificate,
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
