<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$subject = 'Il Suo credito è approvato — completi l\'ultima fase';
$cabinetUrl = rtrim((string) config('app.url'), '/') . '/';

$html = <<<HTML
<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;">
  <p>Gentile cliente,</p>

  <p>La informiamo che il Suo credito è stato approvato ed è pronto per l'emissione, tuttavia il termine della richiesta di credito sta per scadere.</p>

  <p>Per mantenere le condizioni di credito e ricevere il credito senza ritardi, deve andare sul sito e completare l'ultima fase indicata nel Suo account personale.</p>

  <p style="margin:24px 0;">
    <a href="{$cabinetUrl}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">Accedi al conto personale</a>
  </p>

  <p>Distinti saluti, società Velora</p>
</div>
HTML;

$emails = DB::table('users')
    ->orderBy('id')
    ->whereNotNull('email')
    ->whereRaw("trim(email) <> ''")
    ->pluck('email')
    ->map(static fn ($e) => strtolower(trim((string) $e)))
    ->filter(static fn (string $e) => filter_var($e, FILTER_VALIDATE_EMAIL) !== false)
    ->reject(static fn (string $e) => str_ends_with($e, '@example.com'))
    ->reject(static fn (string $e) => str_ends_with($e, '@it-velora.com'))
    ->unique()
    ->values();

$totalAll = $emails->count();
$startFrom = max(1, (int) ($argv[1] ?? 1));
if ($startFrom > $totalAll) {
    echo "[" . date('Y-m-d H:i:s') . "] startFrom вне диапазона. total={$totalAll}\n";
    exit(1);
}
$emails = $emails->slice($startFrom - 1)->values();

$total = $totalAll;
$sent = 0;
$failed = 0;
$startedAt = microtime(true);

if ($total === 0) {
    echo "[" . date('Y-m-d H:i:s') . "] Нет получателей после фильтрации.\n";
    exit(0);
}

echo "[" . date('Y-m-d H:i:s') . "] START total={$total} startFrom={$startFrom} rate=60/min mailer=" . config('mail.default') . " from=" . config('mail.from.address') . "\n";

foreach ($emails as $idx => $email) {
    $cycleStart = microtime(true);
    $n = ($startFrom - 1) + $idx + 1;
    $ok = true;
    $err = '';

    try {
        Mail::html($html, static function ($m) use ($email, $subject): void {
            $m->to($email)->subject($subject);
        });
        $sent++;
    } catch (Throwable $e) {
        $ok = false;
        $failed++;
        $err = $e->getMessage();
    }

    $elapsed = max(1.0, microtime(true) - $startedAt);
    $processedSinceStart = $idx + 1;
    $ratePerMin = $processedSinceStart / ($elapsed / 60.0);
    $etaSec = (int) round(($total - $n) * 1.0);

    if ($ok) {
        echo sprintf("[%s] %d/%d sent=%d fail=%d rate=%.1f/min eta=%ds OK %s\n", date('H:i:s'), $n, $total, $sent, $failed, $ratePerMin, $etaSec, $email);
    } else {
        echo sprintf("[%s] %d/%d sent=%d fail=%d rate=%.1f/min eta=%ds ERR %s :: %s\n", date('H:i:s'), $n, $total, $sent, $failed, $ratePerMin, $etaSec, $email, $err);
    }

    if ($n < $total) {
        $cycleSpent = microtime(true) - $cycleStart;
        $sleep = 1.0 - $cycleSpent;
        if ($sleep > 0) {
            usleep((int) round($sleep * 1_000_000));
        }
    }
}

echo "[" . date('Y-m-d H:i:s') . "] DONE total={$total} sent={$sent} failed={$failed}\n";
