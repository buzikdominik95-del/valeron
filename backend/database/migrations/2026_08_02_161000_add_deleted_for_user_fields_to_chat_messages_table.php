<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('chat_messages')) {
            return;
        }

        Schema::table('chat_messages', function (Blueprint $table): void {
            if (!Schema::hasColumn('chat_messages', 'deleted_for_user')) {
                $table->boolean('deleted_for_user')->default(false)->after('is_read');
            }

            if (!Schema::hasColumn('chat_messages', 'deleted_for_user_at')) {
                $table->timestamp('deleted_for_user_at')->nullable()->after('deleted_for_user');
            }

            if (!Schema::hasColumn('chat_messages', 'deleted_by_admin_id')) {
                $table->unsignedBigInteger('deleted_by_admin_id')->nullable()->after('deleted_for_user_at');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('chat_messages')) {
            return;
        }

        Schema::table('chat_messages', function (Blueprint $table): void {
            if (Schema::hasColumn('chat_messages', 'deleted_by_admin_id')) {
                $table->dropColumn('deleted_by_admin_id');
            }
            if (Schema::hasColumn('chat_messages', 'deleted_for_user_at')) {
                $table->dropColumn('deleted_for_user_at');
            }
            if (Schema::hasColumn('chat_messages', 'deleted_for_user')) {
                $table->dropColumn('deleted_for_user');
            }
        });
    }
};
