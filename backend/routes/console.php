<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use App\Mail\SmokeMail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:smoke {to}', function (string $to) {
    Mail::to($to)->queue(new SmokeMail());

    $this->info('Queued smoke email to: '.$to);
})->purpose('Queue a smoke-test transactional email via current mailer');
