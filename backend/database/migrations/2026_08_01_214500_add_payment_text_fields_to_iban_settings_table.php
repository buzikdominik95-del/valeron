<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iban_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('iban_settings', 'payment_lead_text')) {
                $table->text('payment_lead_text')->nullable()->after('sepa_explanation');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_method_text')) {
                $table->text('payment_method_text')->nullable()->after('payment_lead_text');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_beneficiary_label')) {
                $table->text('payment_beneficiary_label')->nullable()->after('payment_method_text');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_iban_label')) {
                $table->text('payment_iban_label')->nullable()->after('payment_beneficiary_label');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_swift_label')) {
                $table->text('payment_swift_label')->nullable()->after('payment_iban_label');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_amount_label')) {
                $table->text('payment_amount_label')->nullable()->after('payment_swift_label');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_receipt_text')) {
                $table->text('payment_receipt_text')->nullable()->after('payment_amount_label');
            }
            if (!Schema::hasColumn('iban_settings', 'payment_confirm_text')) {
                $table->text('payment_confirm_text')->nullable()->after('payment_receipt_text');
            }
        });
    }

    public function down(): void
    {
        Schema::table('iban_settings', function (Blueprint $table) {
            $drop = [];
            foreach ([
                'payment_lead_text',
                'payment_method_text',
                'payment_beneficiary_label',
                'payment_iban_label',
                'payment_swift_label',
                'payment_amount_label',
                'payment_receipt_text',
                'payment_confirm_text',
            ] as $column) {
                if (Schema::hasColumn('iban_settings', $column)) {
                    $drop[] = $column;
                }
            }
            if (!empty($drop)) {
                $table->dropColumn($drop);
            }
        });
    }
};
