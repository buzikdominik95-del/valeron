<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $count = (int) DB::table('commission_levels')->count();
        if ($count > 0) {
            return;
        }

        $now = now();

        DB::table('commission_levels')->insert([
            [
                'name' => 'Livello 1',
                'amount' => 37.00,
                'approved_amount_bonus' => 0.00,
                'order' => 1,
                'description' => 'Commissione base iniziale',
                'callout_title' => '',
                'callout_body' => '',
                'help_modal_title' => '',
                'help_modal_body' => '',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Livello 2',
                'amount' => 172.00,
                'approved_amount_bonus' => 0.00,
                'order' => 2,
                'description' => 'Copertura assicurativa',
                'callout_title' => '',
                'callout_body' => '',
                'help_modal_title' => '',
                'help_modal_body' => '',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Livello 3',
                'amount' => 136.00,
                'approved_amount_bonus' => 0.00,
                'order' => 3,
                'description' => 'Deposito verifica AML/CPI',
                'callout_title' => '',
                'callout_body' => '',
                'help_modal_title' => '',
                'help_modal_body' => '',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Livello 4',
                'amount' => 0.00,
                'approved_amount_bonus' => 0.00,
                'order' => 4,
                'description' => 'Sblocco prelievo',
                'callout_title' => '',
                'callout_body' => '',
                'help_modal_title' => '',
                'help_modal_body' => '',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('commission_levels')
            ->whereIn('name', ['Livello 1', 'Livello 2', 'Livello 3', 'Livello 4'])
            ->whereIn('order', [1, 2, 3, 4])
            ->delete();
    }
};
