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
        Schema::table('exams', function (Blueprint $table) {
            $table->enum('scoring_type', ['simple', 'negative', 'weighted'])->default('simple')->after('show_result_after_end');
            $table->decimal('negative_mark', 3, 2)->nullable()->after('scoring_type');
            $table->decimal('question_weight', 3, 2)->default(1)->nullable()->after('negative_mark');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->enum('scoring_type', ['simple', 'negative', 'weighted'])->default('simple')->after('show_result_after_end');
            $table->decimal('negative_mark', 3, 2)->nullable()->after('scoring_type');
            $table->decimal('question_weight', 3, 2)->default(1)->nullable()->after('negative_mark');
        });
    }
};
