<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Разовая рассылка «техработы завершены, платформа доступна» по всей базе.
 *
 * php artisan mail:maintenance-done --test=you@example.com   — тестовое письмо
 * php artisan mail:maintenance-done --send                   — боевая рассылка
 *
 * Прогресс в storage/app/maintenance-done-sent.log — повторный запуск
 * пропускает уже отправленных (безопасно перезапускать).
 */
class SendMaintenanceDoneEmail extends Command
{
    protected $signature = 'mail:maintenance-done {--test=} {--send} {--sleep-ms=600}';
    protected $description = 'Notify all users that maintenance is finished and the platform is available';

    public function handle(): int
    {
        $subject = 'Velora — la piattaforma è di nuovo disponibile';

        $test = trim((string) $this->option('test'));
        if ($test !== '') {
            $this->sendOne($test, 'Cliente Velora', $subject);
            $this->info("Test sent to {$test}");
            return self::SUCCESS;
        }

        if (!$this->option('send')) {
            $this->warn('Dry run. Use --test=email for a test or --send for the real blast.');
            return self::SUCCESS;
        }

        $logPath = storage_path('app/maintenance-done-sent.log');
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
        $sleepUs = max(0, (int) $this->option('sleep-ms')) * 1000;

        foreach ($users as $i => $u) {
            $email = strtolower(trim((string) $u->email));
            if ($email === '' || isset($sent[$email])) { $skip++; continue; }

            $fullName = trim(trim((string) ($u->name ?? '')) . ' ' . trim((string) ($u->surname ?? '')));
            if ($fullName === '' || strcasecmp($fullName, 'Anonymous') === 0) {
                $fullName = 'Cliente Velora';
            }

            try {
                $this->sendOne($email, $fullName, $subject);
                file_put_contents($logPath, $email . "\n", FILE_APPEND);
                $ok++;
            } catch (\Throwable $e) {
                $fail++;
                $this->error("FAIL {$email}: " . $e->getMessage());
            }

            if (($i + 1) % 100 === 0) {
                $this->info(sprintf('[%d/%d] ok=%d skip=%d fail=%d', $i + 1, $total, $ok, $skip, $fail));
            }
            if ($sleepUs > 0) usleep($sleepUs);
        }

        $this->info(sprintf('DONE total=%d ok=%d skip=%d fail=%d', $total, $ok, $skip, $fail));
        return self::SUCCESS;
    }

    private function sendOne(string $email, string $fullName, string $subject): void
    {
        Mail::send('mails.maintenance-done', ['fullName' => $fullName], function ($m) use ($email, $subject) {
            $m->to($email)->subject($subject);
        });
    }
}
