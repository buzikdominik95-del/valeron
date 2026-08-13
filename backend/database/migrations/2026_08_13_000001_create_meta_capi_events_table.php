<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('meta_capi_events')) {
            return;
        }

        Schema::create('meta_capi_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->string('event_name', 64);
            $table->string('meta_event_id', 191)->unique();
            $table->timestamp('meta_lead_sent_at')->nullable();
            $table->string('meta_status', 32)->default('pending');
            $table->unsignedInteger('meta_attempts')->default(0);
            $table->unsignedSmallInteger('meta_http_status')->nullable();
            $table->json('meta_response')->nullable();
            $table->timestamps();

            $table->index(['event_name', 'meta_status']);
            $table->index('lead_id');
            $table->unique(['lead_id', 'event_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_capi_events');
    }
};
