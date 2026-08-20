<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$subject = 'Velora - Completamento ultima fase credito';
$ratePerMinute = 60;
$sleepUs = (int) floor(60_000_000 / $ratePerMinute); // 1_000_000us = 1 sec
$logPath = storage_path('app/deborah-campaign-sent.log');
$runLogPath = storage_path('logs/deborah-campaign-run.log');

$sent = file_exists($logPath)
    ? array_flip(array_filter(array_map('trim', file($logPath))))
    : [];

$users = DB::table('users')
    ->select(['id', 'email', 'name', 'surname'])
    ->whereNotNull('email')
    ->where('email', 'like', '%@%')
    ->orderBy('id')
    ->get();

$total = $users->count();
$ok = 0; $skip = 0; $fail = 0;

$w = fopen($runLogPath, 'ab');
$startLine = sprintf("[%s] START total=%d rate=%d/min\n", date('c'), $total, $ratePerMinute);
fwrite($w, $startLine);
echo $startLine;

foreach ($users as $i => $u) {
    $email = strtolower(trim((string) $u->email));
    if ($email === '' || isset($sent[$email])) {
        $skip++;
        continue;
    }

    $fullName = trim(trim((string) ($u->name ?? '')) . ' ' . trim((string) ($u->surname ?? '')));
    if ($fullName === '' || strcasecmp($fullName, 'Anonymous') === 0) {
        $fullName = 'Cliente Velora';
    }

    try {
        Mail::send(
            ['html' => 'emails.deborah-campaign-test', 'text' => 'emails.deborah-campaign-test-text'],
            [],
            function ($m) use ($email, $fullName, $subject) {
                $m->to($email, $fullName)->subject($subject);
            }
        );

        file_put_contents($logPath, $email . "\n", FILE_APPEND);
        $sent[$email] = true;
        $ok++;

        if ($sleepUs > 0) {
            usleep($sleepUs);
        }
    } catch (Throwable $e) {
        $fail++;
        $line = sprintf("[%s] FAIL email=%s err=%s\n", date('c'), $email, $e->getMessage());
        fwrite($w, $line);
    }

    if (($i + 1) % 100 === 0) {
        $line = sprintf("[%s] PROGRESS %d/%d ok=%d skip=%d fail=%d\n", date('c'), $i + 1, $total, $ok, $skip, $fail);
        fwrite($w, $line);
        echo $line;
    }
}

$doneLine = sprintf("[%s] DONE total=%d ok=%d skip=%d fail=%d\n", date('c'), $total, $ok, $skip, $fail);
fwrite($w, $doneLine);
echo $doneLine;
fclose($w);
