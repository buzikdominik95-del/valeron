<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('blocked_users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('ip_address', 45)->nullable()->index();
            $table->string('reason', 255)->nullable();
            $table->unsignedBigInteger('chat_id')->nullable();
            $table->string('blocked_by', 255)->nullable();
            $table->timestamp('blocked_at')->nullable();
            $table->string('unblocked_by', 255)->nullable();
            $table->timestamp('unblocked_at')->nullable();
            $table->timestamps();

            $table->index(['email', 'unblocked_at']);
            $table->index(['ip_address', 'unblocked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_users');
    }
};
