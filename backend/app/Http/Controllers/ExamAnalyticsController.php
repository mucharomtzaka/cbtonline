<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAttemptAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamAnalyticsController extends Controller
{
    public function summary(Request $request, Exam $exam)
    {
        // Get best attempt per user (unique participants)
        $attempts = DB::table('exam_attempts')
            ->where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->selectRaw('
                COUNT(DISTINCT user_id) as total_participants,
                COUNT(*) as total_attempts,
                AVG(CASE WHEN final_score > 0 THEN final_score ELSE score END / NULLIF(max_score, 0) * 100) as avg_percentage,
                MAX(CASE WHEN final_score > 0 THEN final_score ELSE score END / NULLIF(max_score, 0) * 100) as max_percentage,
                MIN(CASE WHEN final_score > 0 THEN final_score ELSE score END / NULLIF(max_score, 0) * 100) as min_percentage
            ')
            ->first();

        return response()->json([
            'exam' => ['id' => $exam->id, 'title' => $exam->title],
            'summary' => [
                'total_participants' => (int) ($attempts->total_participants ?? 0),
                'total_attempts' => (int) ($attempts->total_attempts ?? 0),
                'avg_score' => $attempts->avg_percentage ? round($attempts->avg_percentage) : 0,
                'max_score' => $attempts->max_percentage ? round($attempts->max_percentage) : 0,
                'min_score' => $attempts->min_percentage ? round($attempts->min_percentage) : 0,
            ],
        ]);
    }

    public function itemAnalysis(Request $request, Exam $exam)
    {
        // p-value (difficulty) = proportion correct among attempts (auto gradable only)
        $rows = ExamAttemptAnswer::query()
            ->selectRaw('exam_attempt_answers.question_id, questions.type, COUNT(*) as n, SUM(CASE WHEN exam_attempt_answers.is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->join('exam_attempts', 'exam_attempts.id', '=', 'exam_attempt_answers.exam_attempt_id')
            ->join('questions', 'questions.id', '=', 'exam_attempt_answers.question_id')
            ->where('exam_attempts.exam_id', $exam->id)
            ->whereIn('exam_attempts.status', ['submitted', 'auto_submitted', 'graded'])
            ->whereIn('questions.type', ['multiple_choice', 'true_false', 'matching'])
            ->groupBy('exam_attempt_answers.question_id', 'questions.type')
            ->orderBy('exam_attempt_answers.question_id')
            ->get()
            ->map(function ($r) {
                $n = (int) $r->n;
                $correct = (int) $r->correct;
                $p = $n > 0 ? $correct / $n : 0;
                $typeMap = [
                    'multiple_choice' => 'Pilihan Ganda',
                    'true_false' => 'Benar/Salah',
                    'matching' => 'Menjodohkan',
                ];
                return [
                    'question_id' => (int) $r->question_id,
                    'type' => $typeMap[$r->type] ?? $r->type,
                    'n' => $n,
                    'correct' => $correct,
                    'p_value' => $p,
                ];
            });

        return response()->json([
            'exam' => ['id' => $exam->id, 'title' => $exam->title],
            'items' => $rows,
        ]);
    }
}

