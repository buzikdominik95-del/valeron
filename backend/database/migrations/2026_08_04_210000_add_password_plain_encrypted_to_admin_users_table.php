<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('admin_users')) {
            return;
        }

        if (!Schema::hasColumn('admin_users', 'password_plain_encrypted')) {
            Schema::table('admin_users', function (Blueprint $table) {
                $table->text('password_plain_encrypted')->nullable()->after('password');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('admin_users')) {
            return;
        }

        if (Schema::hasColumn('admin_users', 'password_plain_encrypted')) {
            Schema::table('admin_users', function (Blueprint $table) {
                $table->dropColumn('password_plain_encrypted');
            });
        }
    }
};
