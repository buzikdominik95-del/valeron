<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->string('ai_mode', 16)->default('human')->index();
            $table->boolean('ai_requires_human')->default(false)->index();
            $table->timestamp('ai_last_reply_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('chats', function (Blueprint $table) {
            $table->dropColumn(['ai_mode', 'ai_requires_human', 'ai_last_reply_at']);
        });
    }
};
