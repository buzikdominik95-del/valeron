<?php

namespace App\Support;

final class FunnelProgress
{
    /**
     * Remove state owned by the previous commission stage.
     *
     * CPI completion is retained after L3 (the certificate remains available on
     * L4+), but it must be cleared whenever a lead enters a fresh L3.
     *
     * @return array<string, mixed>
     */
    public static function resetForLevelChange(mixed $raw, int $previousLevel, int $nextLevel): array
    {
        $progress = is_array($raw)
            ? $raw
            : (is_string($raw) ? (json_decode($raw, true) ?: []) : []);

        if ($previousLevel === $nextLevel) {
            return $progress;
        }

        $keys = ['withdraw_fail_notified_at', 'withdraw_anim_started_at', 'policy_build_started_at'];
        if ($nextLevel === 3) {
            $keys[] = 'cpi_certificate_viewed';
            $keys[] = 'cpi_certificate_viewed_at';
        }

        foreach ($keys as $key) {
            unset($progress[$key]);
        }

        return $progress;
    }
}
