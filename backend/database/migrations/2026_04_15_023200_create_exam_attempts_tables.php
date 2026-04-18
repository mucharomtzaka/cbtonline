<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->enum('status', ['in_progress', 'submitted', 'auto_submitted', 'graded'])->default('in_progress');
            $table->dateTime('started_at');
            $table->dateTime('submitted_at')->nullable();

            $table->unsignedInteger('duration_seconds')->nullable(); // snapshot of exam duration
            $table->unsignedInteger('max_score')->default(0);
            $table->unsignedInteger('score')->default(0);

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            $table->index(['exam_id', 'user_id']);
        });

        Schema::create('exam_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();

            $table->json('answer')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->unsignedInteger('score_awarded')->nullable();
            $table->timestamps();

            $table->unique(['exam_attempt_id', 'question_id']);
        });

        Schema::create('exam_attempt_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->string('type'); // tab_switch, blur, focus, paste, fullscreen_exit, webcam_flag, etc.
            $table->json('payload')->nullable();
            $table->dateTime('occurred_at');
            $table->timestamps();

            $table->index(['exam_attempt_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_attempt_events');
        Schema::dropIfExists('exam_attempt_answers');
        Schema::dropIfExists('exam_attempts');
    }
};

