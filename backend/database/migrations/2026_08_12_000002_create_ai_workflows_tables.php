<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('trigger_type', 40)->default('new_message')->index();
            $table->jsonb('graph')->nullable();
            $table->boolean('enabled')->default(false)->index();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('ai_workflow_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('ai_workflows')->cascadeOnDelete();
            $table->unsignedBigInteger('chat_id')->nullable()->index();
            $table->string('status', 20)->default('running')->index();
            $table->string('current_node')->nullable();
            $table->jsonb('context')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_workflow_runs');
        Schema::dropIfExists('ai_workflows');
    }
};
