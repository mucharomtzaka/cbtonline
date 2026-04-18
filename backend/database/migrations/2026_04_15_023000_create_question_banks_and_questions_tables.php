<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_banks', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->constrained()->cascadeOnDelete();

            $table->enum('type', ['multiple_choice', 'multiple_choice_multiple', 'essay', 'true_false', 'matching']);
            $table->text('prompt');
            $table->json('options')->nullable(); // MCQ/matching pairs
            $table->json('correct_answer')->nullable(); // for auto-grading types
            $table->text('explanation')->nullable();

            $table->unsignedSmallInteger('difficulty')->nullable(); // 1-5 (optional)
            $table->json('meta')->nullable(); // tags, attachments, etc.

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
        Schema::dropIfExists('question_banks');
    }
};

