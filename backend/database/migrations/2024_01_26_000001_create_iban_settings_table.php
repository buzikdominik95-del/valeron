<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iban_settings', function (Blueprint $table) {
            $table->id();
            $table->string('global_iban', 34)->nullable();
            $table->string('beneficiary_name')->nullable();
            $table->string('bic_swift', 11)->nullable();
            $table->text('sepa_explanation')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iban_settings');
    }
};
