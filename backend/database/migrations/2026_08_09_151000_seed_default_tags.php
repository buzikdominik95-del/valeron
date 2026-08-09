<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            ['id' => 2, 'name' => 'Nuovo', 'color' => '#3B82F6'],
            ['id' => 3, 'name' => 'FD', 'color' => '#06B6D4'],
            ['id' => 4, 'name' => 'Importante', 'color' => '#F59E0B'],
            ['id' => 5, 'name' => 'VIP', 'color' => '#8B5CF6'],
            ['id' => 7, 'name' => 'Follow-up', 'color' => '#22C55E'],
            ['id' => 8, 'name' => 'Rischio', 'color' => '#EF4444'],
        ];

        $now = now();

        foreach ($defaults as $tag) {
            $exists = DB::table('tags')->where('id', $tag['id'])->exists();
            if ($exists) {
                continue;
            }

            DB::table('tags')->insert([
                'id' => $tag['id'],
                'name' => $tag['name'],
                'color' => $tag['color'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Поднять sequence, если вставили записи с явными ID.
        DB::statement("SELECT setval(pg_get_serial_sequence('tags','id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tags), 1), true)");
    }

    public function down(): void
    {
        DB::table('tags')->whereIn('id', [2, 3, 4, 5, 7, 8])->delete();
    }
};
