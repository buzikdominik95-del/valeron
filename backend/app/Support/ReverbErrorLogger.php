<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Laravel\Reverb\Contracts\Logger;

/** Log Reverb failures without logging chat payloads or routine socket traffic. */
final class ReverbErrorLogger implements Logger
{
    public function info(string $title, ?string $message = null): void
    {
        // Intentionally silent: connections and pings are high-volume.
    }

    public function error(string $string): void
    {
        Log::error('Reverb: '.$string);
    }

    public function message(string $message): void
    {
        // Never write client message bodies to the application log.
    }

    public function line(int $lines = 1): void
    {
        // CLI formatting is not needed in the application log.
    }
}
