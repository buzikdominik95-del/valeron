<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'surname')) {
                    $table->string('surname')->nullable()->after('name');
                }
                if (!Schema::hasColumn('users', 'phone')) {
                    $table->string('phone', 32)->nullable()->after('email');
                }
                if (!Schema::hasColumn('users', 'requested_amount')) {
                    $table->decimal('requested_amount', 14, 2)->nullable()->after('phone');
                }
                if (!Schema::hasColumn('users', 'document_type')) {
                    $table->string('document_type', 100)->nullable()->after('requested_amount');
                }
                if (!Schema::hasColumn('users', 'document_number')) {
                    $table->string('document_number', 255)->nullable()->after('document_type');
                }
                if (!Schema::hasColumn('users', 'wizard_progress')) {
                    $table->json('wizard_progress')->nullable()->after('document_number');
                }
                if (!Schema::hasColumn('users', 'commission_level_id')) {
                    $table->unsignedInteger('commission_level_id')->default(1)->after('wizard_progress');
                }
                if (!Schema::hasColumn('users', 'assigned_manager_id')) {
                    $table->unsignedBigInteger('assigned_manager_id')->nullable()->after('commission_level_id');
                }
            });
        }

        if (!Schema::hasTable('leads')) {
            Schema::create('leads', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('first_name')->nullable();
                $table->string('last_name')->nullable();
                $table->string('email')->nullable();
                $table->string('phone', 32)->nullable();
                $table->decimal('requested_amount', 14, 2)->nullable();
                $table->string('document_number')->nullable();
                $table->unsignedInteger('credit_term_months')->nullable();
                $table->string('iban')->nullable();
                $table->unsignedInteger('commission_level_id')->default(1);
                $table->unsignedBigInteger('assigned_manager_id')->nullable();
                $table->timestamps();

                $table->index('user_id');
                $table->index('email');
                $table->index('assigned_manager_id');
                $table->index('commission_level_id');
            });
        }

        if (!Schema::hasTable('chats')) {
            Schema::create('chats', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('manager_id')->nullable();
                $table->string('status', 50)->default('open');
                $table->text('notes')->nullable();
                $table->timestamp('last_message_at')->nullable();
                $table->timestamps();

                $table->index('user_id');
                $table->index('manager_id');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('chat_messages')) {
            Schema::create('chat_messages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('chat_id');
                $table->string('sender_type', 20)->default('user');
                $table->unsignedBigInteger('sender_id')->nullable();
                $table->text('message')->nullable();
                $table->string('attachment_kind', 20)->nullable();
                $table->string('attachment_name')->nullable();
                $table->string('attachment_url', 2048)->nullable();
                $table->string('attachment_mime')->nullable();
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->boolean('deleted_for_user')->default(false);
                $table->timestamp('deleted_for_user_at')->nullable();
                $table->unsignedBigInteger('deleted_by_admin_id')->nullable();
                $table->timestamps();

                $table->index('chat_id');
                $table->index(['chat_id', 'created_at']);
                $table->index(['chat_id', 'sender_type', 'is_read']);
            });
        }

        if (!Schema::hasTable('chat_tag')) {
            Schema::create('chat_tag', function (Blueprint $table) {
                $table->unsignedBigInteger('chat_id');
                $table->unsignedBigInteger('tag_id');
                $table->primary(['chat_id', 'tag_id']);
                $table->index('tag_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_tag');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chats');
        Schema::dropIfExists('leads');
    }
};
