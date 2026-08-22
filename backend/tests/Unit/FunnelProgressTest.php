<?php

namespace Tests\Unit;

use App\Support\FunnelProgress;
use PHPUnit\Framework\TestCase;

class FunnelProgressTest extends TestCase
{
    public function test_entering_level_three_clears_previous_cpi_and_timer_state(): void
    {
        $progress = FunnelProgress::resetForLevelChange([
            'cpi_certificate_viewed' => true,
            'cpi_certificate_viewed_at' => '2026-08-22T10:00:00Z',
            'policy_build_started_at' => '2026-08-22T09:55:00Z',
            'withdraw_anim_started_at' => '2026-08-22T09:50:00Z',
            'documents_verified' => true,
        ], 2, 3);

        $this->assertArrayNotHasKey('cpi_certificate_viewed', $progress);
        $this->assertArrayNotHasKey('cpi_certificate_viewed_at', $progress);
        $this->assertArrayNotHasKey('policy_build_started_at', $progress);
        $this->assertArrayNotHasKey('withdraw_anim_started_at', $progress);
        $this->assertTrue($progress['documents_verified']);
    }

    public function test_leaving_level_three_keeps_the_issued_certificate(): void
    {
        $progress = FunnelProgress::resetForLevelChange([
            'cpi_certificate_viewed' => true,
            'cpi_certificate_viewed_at' => '2026-08-22T10:00:00Z',
            'withdraw_fail_notified_at' => '2026-08-22T10:05:00Z',
        ], 3, 4);

        $this->assertTrue($progress['cpi_certificate_viewed']);
        $this->assertSame('2026-08-22T10:00:00Z', $progress['cpi_certificate_viewed_at']);
        $this->assertArrayNotHasKey('withdraw_fail_notified_at', $progress);
    }

    public function test_same_level_does_not_reset_progress(): void
    {
        $before = [
            'cpi_certificate_viewed' => true,
            'policy_build_started_at' => '2026-08-22T09:55:00Z',
        ];

        $this->assertSame($before, FunnelProgress::resetForLevelChange($before, 3, 3));
    }
}
