<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->unique();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->json('theme_config')->nullable();
            $table->boolean('is_template')->default(false);
            $table->timestamps();
            $table->index('domain');
            $table->index('status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeignKeyIfExists('users_tenant_id_foreign');
            $table->dropColumn('tenant_id');
        });
        Schema::dropIfExists('tenants');
    }
};
