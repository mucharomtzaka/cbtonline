<?php

namespace App\Http\Controllers;

use App\Models\QuestionBank;
use App\Models\Question;
use App\Services\GeminiService;
use App\Services\AIService;
use Illuminate\Http\Request;

class QuestionBankController extends Controller
{
    public function index(Request $request)
    {
        $banks = QuestionBank::query()
            ->withCount('questions')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $banks]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $bank = QuestionBank::create([
            ...$data,
            'owner_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $bank, 'message' => 'Bank soal berhasil dibuat'], 201);
    }

    public function update(Request $request, QuestionBank $questionBank)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $questionBank->update($data);

        return response()->json(['data' => $questionBank, 'message' => 'Bank soal berhasil diubah']);
    }

    public function destroy(Request $request, QuestionBank $questionBank)
    {
        $questionBank->delete();

        return response()->json(['message' => 'Bank soal berhasil dihapus']);
    }

    public function show(QuestionBank $questionBank)
    {
        return response()->json(['data' => $questionBank]);
    }

    /**
     * Generate questions using AI
     */
    public function generate(Request $request, QuestionBank $questionBank)
    {
        $data = $request->validate([
            'topic' => ['required', 'string'],
            'count' => ['required', 'integer', 'min:1', 'max:50'],
            'type' => ['required', 'string', 'in:multiple_choice,true_false,essay'],
        ]);

        $ai = new AIService();
        
        try {
            $generatedQuestions = $ai->generateQuestions(
                $data['topic'],
                $data['count'],
                $data['type']
            );

            // Save questions to database
            $savedQuestions = [];
            foreach ($generatedQuestions as $q) {
                $question = Question::create([
                    'question_bank_id' => $questionBank->id,
                    'type' => $q['type'],
                    'prompt' => $q['prompt'],
                    'options' => $q['options'],
                    'answer' => $q['answer'],
                    'correct_answer' => $q['correct_answer'],
                    'explanation' => $q['explanation'],
                ]);
                $savedQuestions[] = $question;
            }

            return response()->json([
                'message' => 'Berhasil generate ' . count($savedQuestions) . ' soal',
                'data' => $savedQuestions,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal generate soal: ' . $e->getMessage(),
            ], 500);
        }
    }
}

