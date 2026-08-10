<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class AdminManagerLevelStore
{
    private const PRIMARY_KEY = 'manager_handled_levels';

    /** @var array<int>|null */
    private static ?array $defaultLevels = null;

    /**
     * @return array<int>
     */
    public static function getFor(int $adminId): array
    {
        if ($adminId <= 0) {
            return self::getDefaultLevels();
        }

        $keys = [
            self::PRIMARY_KEY,
            'manager_levels_by_admin',
            'admin_manager_levels',
        ];

        foreach ($keys as $key) {
            $map = self::getSettingsMap($key);
            if (empty($map)) {
                continue;
            }

            $entry = $map[(string) $adminId] ?? $map[$adminId] ?? null;
            if (!is_array($entry)) {
                continue;
            }

            $levels = self::sanitizeLevels($entry);
            if (!empty($levels)) {
                return $levels;
            }
        }

        return self::getDefaultLevels();
    }

    /**
     * @param array<int,mixed> $levels
     */
    public static function setFor(int $adminId, array $levels): void
    {
        if ($adminId <= 0) {
            return;
        }

        $normalized = self::sanitizeLevels($levels);
        if (empty($normalized)) {
            $normalized = [1];
        }

        $map = self::getSettingsMap(self::PRIMARY_KEY);
        $map[(string) $adminId] = $normalized;
        self::saveSettingsMap(self::PRIMARY_KEY, $map);
    }

    public static function removeFor(int $adminId): void
    {
        if ($adminId <= 0) {
            return;
        }

        $map = self::getSettingsMap(self::PRIMARY_KEY);
        $changed = false;

        if (array_key_exists((string) $adminId, $map)) {
            unset($map[(string) $adminId]);
            $changed = true;
        }

        if (array_key_exists($adminId, $map)) {
            unset($map[$adminId]);
            $changed = true;
        }

        if ($changed) {
            self::saveSettingsMap(self::PRIMARY_KEY, $map);
        }
    }

    /**
     * @param array<int,mixed> $levels
     * @return array<int>
     */
    private static function sanitizeLevels(array $levels): array
    {
        $result = [];
        foreach ($levels as $value) {
            $n = (int) $value;
            if ($n > 0) {
                $result[] = $n;
            }
        }

        $result = array_values(array_unique($result));
        sort($result);

        return $result;
    }

    /**
     * @return array<int>
     */
    private static function getDefaultLevels(): array
    {
        if (self::$defaultLevels !== null) {
            return self::$defaultLevels;
        }

        $levels = [];
        $columns = [];

        try {
            $columns = DB::getSchemaBuilder()->getColumnListing('commission_levels');
        } catch (\Throwable $e) {
            $columns = [];
        }

        $column = null;
        if (in_array('level_number', $columns, true)) {
            $column = 'level_number';
        } elseif (in_array('order', $columns, true)) {
            $column = 'order';
        }

        if ($column !== null) {
            $levels = DB::table('commission_levels')
                ->whereNotNull($column)
                ->orderBy($column)
                ->pluck($column)
                ->map(static fn ($v) => (int) $v)
                ->filter(static fn ($v) => $v > 0)
                ->unique()
                ->values()
                ->all();
        }

        if (empty($levels)) {
            $levels = [1, 2, 3, 4, 5];
        }

        self::$defaultLevels = $levels;

        return self::$defaultLevels;
    }

    private static function getSettingsMap(string $key): array
    {
        $raw = DB::table('system_settings')->where('key', $key)->value('value');

        if (!is_string($raw)) {
            return [];
        }

        if (trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    private static function saveSettingsMap(string $key, array $map): void
    {
        DB::table('system_settings')->updateOrInsert(
            ['key' => $key],
            [
                'value' => json_encode($map, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }
}
