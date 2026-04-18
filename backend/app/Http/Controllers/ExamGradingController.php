<?php

namespace App\Http\Controllers;

use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamGradingController extends Controller
{
    public function pendingEssays(Request $request)
    {
        $attempts = ExamAttempt::query()
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->whereHas('answers.question', fn ($q) => $q->where('type', 'essay'))
            ->with(['user:id,name,username', 'exam:id,title'])
            ->orderByDesc('submitted_at')
            ->paginate(50);

        return response()->json($attempts);
    }

    public function showAttempt(Request $request, ExamAttempt $examAttempt)
    {
        $examAttempt->load([
            'user:id,name,username,email',
            'exam:id,title',
            'answers.question:id,type,prompt',
        ]);

        return response()->json(['attempt' => $examAttempt]);
    }

    public function gradeAttempt(Request $request, ExamAttempt $examAttempt)
    {
        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.score_awarded' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        return DB::transaction(function () use ($request, $examAttempt, $data) {
            $autoScore = (int) $examAttempt->score;
            $manual = 0;

            foreach ($data['answers'] as $a) {
                $row = ExamAttemptAnswer::query()
                    ->where('exam_attempt_id', $examAttempt->id)
                    ->where('question_id', $a['question_id'])
                    ->with('question')
                    ->first();

                if (!$row || !$row->question || $row->question->type !== 'essay') {
                    continue;
                }

                $scoreAwarded = $a['score_awarded'] ?? null;
                $row->update([
                    'score_awarded' => $scoreAwarded,
                ]);

                // Handle both int and string from JSON
                if ($scoreAwarded !== null && is_numeric($scoreAwarded)) {
                    $manual += (int) $scoreAwarded;
                }
            }

            $final = $autoScore + $manual;

            $examAttempt->update([
                'manual_score' => $manual,
                'final_score' => $final,
                'status' => 'graded',
                'graded_at' => CarbonImmutable::now(),
                'graded_by_user_id' => $request->user()->id,
            ]);

            return response()->json(['attempt' => $examAttempt->fresh()]);
        });
    }
}

