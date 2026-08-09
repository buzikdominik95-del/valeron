<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SmokeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Velora SMTP/Resend smoke test',
            tags: ['smoke-test'],
            metadata: [
                'flow' => 'smoke_test',
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.smoke',
        );
    }
}
