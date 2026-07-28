<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class AdminUiPermissionStore
{
    private const KEY = 'admin_user_ui_permissions';

    public static function getAll(): array
    {
        $raw = DB::table('system_settings')->where('key', self::KEY)->value('value');
        if (!$raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function getFor(int $adminUserId): array
    {
        $all = self::getAll();
        $value = $all[(string) $adminUserId] ?? [];

        return is_array($value)
            ? array_values(array_unique(array_map('strval', $value)))
            : [];
    }

    public static function setFor(int $adminUserId, array $hiddenElements): void
    {
        $all = self::getAll();
        $all[(string) $adminUserId] = array_values(array_unique(array_map('strval', $hiddenElements)));

        DB::table('system_settings')->updateOrInsert(
            ['key' => self::KEY],
            [
                'value' => json_encode($all, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public static function removeFor(int $adminUserId): void
    {
        $all = self::getAll();
        unset($all[(string) $adminUserId]);

        DB::table('system_settings')->updateOrInsert(
            ['key' => self::KEY],
            [
                'value' => json_encode($all, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }
}
