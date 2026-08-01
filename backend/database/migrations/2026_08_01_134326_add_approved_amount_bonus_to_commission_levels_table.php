<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commission_levels', function (Blueprint $table) {
            if (!Schema::hasColumn('commission_levels', 'approved_amount_bonus')) {
                $table->decimal('approved_amount_bonus', 12, 2)->default(0)->after('amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('commission_levels', function (Blueprint $table) {
            if (Schema::hasColumn('commission_levels', 'approved_amount_bonus')) {
                $table->dropColumn('approved_amount_bonus');
            }
        });
    }
};
