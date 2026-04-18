<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();

            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();

            $table->unsignedInteger('duration_seconds')->nullable(); // timer
            $table->unsignedSmallInteger('attempt_limit')->default(1);

            $table->boolean('randomize_questions')->default(false);
            $table->boolean('randomize_options')->default(false);
            $table->boolean('auto_submit_on_timeout')->default(true);

            $table->boolean('show_result_after_submit')->default(false);
            $table->boolean('show_result_after_end')->default(true);

            $table->timestamps();
        });

        Schema::create('exam_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->timestamps();
        });

        Schema::create('exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();

            $table->unsignedSmallInteger('points')->default(1);
            $table->unsignedInteger('fixed_order')->nullable(); // if not randomized
            $table->timestamps();

            $table->unique(['exam_id', 'question_id']);
        });

        Schema::create('exam_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('token', 32)->index(); // simple access code
            $table->boolean('is_active')->default(true);
            $table->dateTime('expires_at')->nullable();
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_access_tokens');
        Schema::dropIfExists('exam_questions');
        Schema::dropIfExists('exam_schedules');
        Schema::dropIfExists('exams');
    }
};

