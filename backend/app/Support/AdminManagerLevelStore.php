<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class AdminManagerLevelStore
{
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
            'manager_levels_by_admin',
            'admin_manager_levels',
            'manager_handled_levels',
        ];

        foreach ($keys as $key) {
            $raw = DB::table('system_settings')->where('key', $key)->value('value');

            if (!is_string($raw)) {
                continue;
            }

            if (trim($raw) === '') {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                continue;
            }

            $entry = $decoded[(string) $adminId] ?? $decoded[$adminId] ?? null;
            if (!is_array($entry)) {
                continue;
            }

            $levels = array_values(array_unique(array_filter(array_map(static fn ($v) => (int) $v, $entry), static fn ($v) => $v > 0)));
            sort($levels);
            if (!empty($levels)) {
                return $levels;
            }
        }

        return self::getDefaultLevels();
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
            $levels = [1, 2, 3, 4];
        }

        self::$defaultLevels = $levels;

        return self::$defaultLevels;
    }
}
