<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commission_levels', function (Blueprint $table) {
            if (!Schema::hasColumn('commission_levels', 'callout_title')) {
                $table->text('callout_title')->nullable()->after('description');
            }
            if (!Schema::hasColumn('commission_levels', 'callout_body')) {
                $table->text('callout_body')->nullable()->after('callout_title');
            }
            if (!Schema::hasColumn('commission_levels', 'help_modal_title')) {
                $table->text('help_modal_title')->nullable()->after('callout_body');
            }
            if (!Schema::hasColumn('commission_levels', 'help_modal_body')) {
                $table->text('help_modal_body')->nullable()->after('help_modal_title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('commission_levels', function (Blueprint $table) {
            $drop = [];
            foreach (['callout_title', 'callout_body', 'help_modal_title', 'help_modal_body'] as $column) {
                if (Schema::hasColumn('commission_levels', $column)) {
                    $drop[] = $column;
                }
            }
            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
