<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->unsignedInteger('manual_score')->default(0)->after('score');
            $table->unsignedInteger('final_score')->default(0)->after('manual_score');
            $table->dateTime('graded_at')->nullable()->after('submitted_at');
            $table->foreignId('graded_by_user_id')->nullable()->after('graded_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('graded_by_user_id');
            $table->dropColumn(['manual_score', 'final_score', 'graded_at']);
        });
    }
};

