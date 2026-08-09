<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_delivery_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 32)->default('resend');
            $table->string('provider_event_id', 191)->nullable();
            $table->string('message_id', 191)->nullable();
            $table->string('event_type', 64);
            $table->string('status', 32)->default('unknown');
            $table->string('recipient', 255)->nullable();
            $table->string('subject', 255)->nullable();
            $table->timestampTz('occurred_at')->nullable();
            $table->jsonb('payload');
            $table->timestamps();

            $table->unique(['provider', 'provider_event_id'], 'email_delivery_events_provider_event_unique');
            $table->index(['provider', 'status'], 'email_delivery_events_provider_status_idx');
            $table->index('message_id', 'email_delivery_events_message_id_idx');
            $table->index('recipient', 'email_delivery_events_recipient_idx');
            $table->index('occurred_at', 'email_delivery_events_occurred_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_delivery_events');
    }
};
