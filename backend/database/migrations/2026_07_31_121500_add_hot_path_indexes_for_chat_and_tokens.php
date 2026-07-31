<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('chat_messages')) {
            DB::statement('CREATE INDEX IF NOT EXISTS chat_messages_chat_created_idx ON chat_messages (chat_id, created_at)');
            DB::statement("CREATE INDEX IF NOT EXISTS chat_messages_chat_sender_read_idx ON chat_messages (chat_id, sender_type, is_read)");
        }

        if (Schema::hasTable('personal_access_tokens')) {
            DB::statement('CREATE INDEX IF NOT EXISTS personal_access_tokens_type_id_last_used_idx ON personal_access_tokens (tokenable_type, tokenable_id, last_used_at)');
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS chat_messages_chat_created_idx');
        DB::statement('DROP INDEX IF EXISTS chat_messages_chat_sender_read_idx');
        DB::statement('DROP INDEX IF EXISTS personal_access_tokens_type_id_last_used_idx');
    }
};
