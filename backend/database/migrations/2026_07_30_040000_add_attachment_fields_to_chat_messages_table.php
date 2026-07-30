<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('chat_messages')) {
            return;
        }

        Schema::table('chat_messages', function (Blueprint $table): void {
            if (!Schema::hasColumn('chat_messages', 'attachment_kind')) {
                $table->string('attachment_kind', 16)->nullable()->after('message');
            }
            if (!Schema::hasColumn('chat_messages', 'attachment_name')) {
                $table->string('attachment_name', 255)->nullable()->after('attachment_kind');
            }
            if (!Schema::hasColumn('chat_messages', 'attachment_url')) {
                $table->string('attachment_url', 2048)->nullable()->after('attachment_name');
            }
            if (!Schema::hasColumn('chat_messages', 'attachment_mime')) {
                $table->string('attachment_mime', 255)->nullable()->after('attachment_url');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('chat_messages')) {
            return;
        }

        Schema::table('chat_messages', function (Blueprint $table): void {
            if (Schema::hasColumn('chat_messages', 'attachment_mime')) {
                $table->dropColumn('attachment_mime');
            }
            if (Schema::hasColumn('chat_messages', 'attachment_url')) {
                $table->dropColumn('attachment_url');
            }
            if (Schema::hasColumn('chat_messages', 'attachment_name')) {
                $table->dropColumn('attachment_name');
            }
            if (Schema::hasColumn('chat_messages', 'attachment_kind')) {
                $table->dropColumn('attachment_kind');
            }
        });
    }
};
