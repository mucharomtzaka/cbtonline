<?php

namespace App\Http\Controllers;

use App\Exports\ExamResultsExport;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Maatwebsite\Excel\Facades\Excel;

class ExamReportController extends Controller
{
    private function authenticateFromToken(Request $request): ?User
    {
        $token = $request->query('token');
        if (!$token) {
            return null;
        }
        // Find user by Sanctum token using findToken (handles hashing internally)
        $personalAccessToken = PersonalAccessToken::findToken($token);
        if ($personalAccessToken) {
            $user = $personalAccessToken->tokenable;
            if ($user && $user->hasAnyRole(['admin', 'guru', 'viewer'])) {
                Auth::login($user);
                return $user;
            }
        }
        return null;
    }

    public function results(Request $request, Exam $exam)
    {
        $perPage = $request->integer('per_page', 10);
        $perPage = match ($perPage) {
            5 => 5,
            10 => 10,
            25 => 25,
            50 => 50,
            default => 10,
        };

        $userId = $request->integer('user_id');
        $requestUser = $request->user();

        // Get best attempt per user with score details
        $query = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('user:id,name,username,email')
            ->with('answers');
        
        // Filter to current user's results only if not guru/admin
        if ($requestUser && !$requestUser->hasAnyRole(['admin', 'guru'])) {
            $query->where('user_id', $requestUser->id);
        }
        
        $query = $query->get()->groupBy('user_id')
            ->map(function ($attempts, $userId) {
                // Sort by final_score first, then by score as fallback
                $best = $attempts->sortByDesc(function ($a) {
                    return $a->final_score ?? $a->score;
                })->first();
                
                $correctCount = $best->answers->filter(fn($a) => $a->is_correct === true)->count();
                $incorrectCount = $best->answers->filter(fn($a) => $a->is_correct === false)->count();
                $maxScore = (int) $best->max_score;
                // Use final_score if available and > 0, otherwise use score
                $score = ($best->final_score !== null && $best->final_score > 0) ? $best->final_score : $best->score;
                $percentage = min(100, $maxScore > 0 ? round(($score / $maxScore) * 100) : 0);

                return [
                    'user_id' => $userId,
                    'user' => $best->user,
                    'best_score' => $score,
                    'max_score' => $maxScore,
                    'correct_count' => $correctCount,
                    'incorrect_count' => $incorrectCount,
                    'percentage' => $percentage,
                    'attempts_count' => $attempts->count(),
                    'submitted_at' => $best->submitted_at?->toIso8601String(),
                    'best_attempt_id' => $best->id,
                    'final_score' => $score,
                    'manual_score' => $best->manual_score ?? 0,
                    'answers' => $best->answers->map(function ($a) {
                        $question = \App\Models\Question::find($a->question_id);
                        $options = $question?->options ?? [];
                        // Handle both array and JSON string
                        $qType = $question?->type ?? 'essay';
                        $options = $question?->options ?? [];
                        $rawAnswer = $a->answer;
                        $answerData = is_array($rawAnswer) ? $rawAnswer : (is_string($rawAnswer) ? json_decode($rawAnswer, true) : []);
                        
                        // Format answer based on type
                        $answerText = '';
                        if ($qType === 'multiple_choice') {
                            $choiceIdx = null;
                            if (is_array($answerData) && isset($answerData['choice'])) {
                                $idx = $answerData['choice'];
                                if (is_int($idx) || (is_string($idx) && ctype_digit($idx))) {
                                    $choiceIdx = (int) $idx;
                                }
                            }
                            if ($choiceIdx !== null && is_array($options) && isset($options[$choiceIdx])) {
                                $val = $options[$choiceIdx];
                                $answerText = is_string($val) ? $val : json_encode($val);
                            } else {
                                $answerText = is_string($rawAnswer) ? $rawAnswer : '';
                            }
                        } elseif ($qType === 'true_false') {
                            $val = is_array($answerData) ? ($answerData['value'] ?? '') : (is_string($rawAnswer) ? $rawAnswer : '');
                            $answerText = $val === true || $val === 'true' ? 'True' : ($val === false || $val === 'false' ? 'False' : $val);
                        } elseif ($qType === 'matching') {
                            $sources = $options[0] ?? [];
                            $targets = $options[1] ?? [];
                            if (is_array($answerData) && isset($answerData['pairs'])) {
                                $pairs = $answerData['pairs'];
                                $parts = [];
                                foreach ($pairs as $sourceIdx => $targetIdx) {
                                    $sourceText = $sources[$sourceIdx] ?? "Source $sourceIdx";
                                    $targetText = $targets[$targetIdx] ?? "Target $targetIdx";
                                    $parts[] = "$sourceText -> $targetText";
                                }
                                $answerText = implode(', ', $parts);
                            } else {
                                $answerText = is_string($rawAnswer) ? $rawAnswer : '';
                            }
                        } elseif ($qType === 'multiple_choice_multiple') {
                            if (is_array($answerData) && isset($answerData['choices'])) {
                                $choices = $answerData['choices'];
                                $parts = [];
                                foreach ($choices as $idx) {
                                    if (is_int($idx) || (is_string($idx) && ctype_digit($idx))) {
                                        $i = (int) $idx;
                                        $val = isset($options[$i]) ? $options[$i] : (string) $i;
                                        $parts[] = is_string($val) ? $val : (string) $val;
                                    }
                                }
                                $answerText = implode(', ', $parts);
                            } else {
                                $answerText = is_string($rawAnswer) ? $rawAnswer : '';
                            }
                        } elseif ($qType === 'essay') {
                            $answerText = is_array($answerData) ? ($answerData['text'] ?? '') : (is_string($rawAnswer) ? $rawAnswer : '');
                        } else {
                            // Default fallback
                            if (is_array($answerData) && isset($answerData['text'])) {
                                $answerText = $answerData['text'];
                            } elseif (is_string($rawAnswer)) {
                                $answerText = $rawAnswer;
                            } else {
                                $answerText = '';
                            }
                        }
                        
                        // Handle correct_answer display
                        $correctIdx = $question?->correct_answer;
                        $correctText = '';
                        if ($qType === 'multiple_choice') {
                            $correctRaw = is_array($correctIdx) ? $correctIdx : (is_string($correctIdx) ? json_decode($correctIdx, true) : $correctIdx);
                            // Recursive flatten function
                            $flatCorrect = [];
                            if (is_array($correctRaw)) {
                                $stack = [$correctRaw];
                                while (count($stack) > 0) {
                                    $current = array_pop($stack);
                                    foreach ($current as $v) {
                                        if (is_array($v)) {
                                            $stack[] = $v;
                                        } else {
                                            $flatCorrect[] = $v;
                                        }
                                    }
                                }
                            } else {
                                $flatCorrect = [$correctRaw];
                            }
                            $parts = [];
                            foreach ($flatCorrect as $idx) {
                                if (is_int($idx) || (is_string($idx) && ctype_digit($idx))) {
                                    $i = (int) $idx;
                                    $val = isset($options[$i]) ? $options[$i] : (string) $i;
                                    $parts[] = is_string($val) ? $val : (string) $val;
                                }
                            }
                            $correctText = implode(', ', $parts);
                        } elseif ($qType === 'true_false') {
                            if (is_bool($correctIdx)) {
                                $correctText = $correctIdx ? 'True' : 'False';
                            } elseif (is_string($correctIdx)) {
                                $correctText = ($correctIdx === 'true' || $correctIdx === '1') ? 'True' : 'False';
                            } else {
                                $correctText = (string) $correctIdx;
                            }
                        } elseif ($qType === 'matching') {
                            $sources = $options[0] ?? [];
                            $targets = $options[1] ?? [];
                            $correctArray = is_string($correctIdx) ? json_decode($correctIdx, true) : (is_array($correctIdx) ? $correctIdx : []);
                            $parts = [];
                            if (is_array($correctArray)) {
                                foreach ($correctArray as $sourceIdx => $targetIdx) {
                                    $sourceText = $sources[$sourceIdx] ?? "Source $sourceIdx";
                                    $targetText = $targets[$targetIdx] ?? "Target $targetIdx";
                                    $parts[] = "$sourceText -> $targetText";
                                }
                            }
                            $correctText = implode(', ', $parts);
                        } elseif ($qType === 'multiple_choice_multiple') {
                            $correctRaw = is_string($correctIdx) ? json_decode($correctIdx, true) : (is_array($correctIdx) ? $correctIdx : []);
                            $parts = [];
                            if (is_array($correctRaw)) {
                                foreach ($correctRaw as $idx) {
                                    if (is_int($idx) || (is_string($idx) && ctype_digit($idx))) {
                                        $i = (int) $idx;
                                        $val = isset($options[$i]) ? $options[$i] : (string) $i;
                                        $parts[] = is_string($val) ? $val : (string) $val;
                                    }
                                }
                            }
                            $correctText = implode(', ', $parts);
                        } else {
                            // Default: handle any type
                            if (is_array($correctIdx)) {
                                $correctText = json_encode($correctIdx);
                            } elseif (is_string($correctIdx)) {
                                $correctText = $correctIdx;
                            } elseif ($correctIdx !== null) {
                                $correctText = (string) $correctIdx;
                            } else {
                                $correctText = '';
                            }
                        }
                        return [
                            'question_id' => $a->question_id,
                            'question' => $question?->prompt,
                            'type' => $question?->type,
                            'options' => $options,
                            'answer' => $answerText,
                            'correct_answer' => $correctText,
                            'explanation' => $question?->explanation,
                            'is_correct' => $a->is_correct,
                            'score_awarded' => $a->score_awarded,
                        ];
                    })->values(),
                ];
            })
            ->sortByDesc('best_score')
            ->values()
            ->map(function ($r, $i) {
                $r['rank'] = $i + 1;
                return $r;
            })
            ->values();

        // Filter by user_id if provided
        if ($userId) {
            $query = $query->where('user_id', $userId);
        }

        // Paginate
        $total = $query->count();
        $lastPage = ceil($total / $perPage) ?: 1;
        $page = $request->integer('page', 1);
        $page = max(1, min($page, $lastPage));
        $data = $query->forPage($page, $perPage)->values();

        return response()->json([
            'exam' => ['id' => $exam->id, 'title' => $exam->title],
            'data' => $data,
            'current_page' => $page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function ranking(Request $request, Exam $exam)
    {
        // Get the best attempt per user with score details
        $rows = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('user:id,name,username')
            ->withCount('answers')
            ->get()
            ->groupBy('user_id')
            ->map(function ($attempts, $userId) use ($exam) {
                // Get the best attempt by final_score
                $best = $attempts->sortByDesc('final_score')->first();
                
                // Calculate correct/incorrect from answers
                $correctCount = $best->answers->filter(fn($a) => $a->is_correct === true)->count();
                $incorrectCount = $best->answers->filter(fn($a) => $a->is_correct === false)->count();
                $maxScore = (int) $best->max_score;
                // Use final_score if available
                $score = $best->final_score ?? $best->score;
                
                return [
                    'user_id' => $userId,
                    'user' => $best->user,
                    'best_score' => $score,
                    'max_score' => $maxScore,
                    'correct_count' => $correctCount,
                    'incorrect_count' => $incorrectCount,
                    'percentage' => $maxScore > 0 ? round(($score / $maxScore) * 100) : 0,
                    'attempts_count' => $attempts->count(),
                    'submitted_at' => $best->submitted_at?->toIso8601String(),
                ];
            })
            ->sortByDesc('best_score')
            ->values()
            ->map(function ($r, $i) {
                $r['rank'] = $i + 1;
                return $r;
            })
            ->values();

        return response()->json([
            'exam' => ['id' => $exam->id, 'title' => $exam->title],
            'ranking' => $rows,
        ]);
    }

    public function exportExcel(Request $request, Exam $exam)
    {
        return Excel::download(new ExamResultsExport($exam->id), "exam-{$exam->id}-results.xlsx");
    }

    public function exportPdf(Request $request, Exam $exam)
    {
        // Try token-based auth if not authenticated
        $this->authenticateFromToken($request);

        // Still check auth
        $user = $request->user();
        if (!$user || !$user->hasAnyRole(['admin', 'guru', 'viewer'])) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $attempts = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('user:id,name,username,email')
            ->with('answers')
            ->get()
            ->map(function ($attempt) {
                $correctCount = $attempt->answers->filter(fn($a) => $a->is_correct === true)->count();
                $incorrectCount = $attempt->answers->filter(fn($a) => $a->is_correct === false)->count();
                $maxScore = (int) $attempt->max_score;
                $score = (int) $attempt->score;
                $percentage = min(100, $maxScore > 0 ? round(($score / $maxScore) * 100) : 0);

                $attempt->correct_count = $correctCount;
                $attempt->incorrect_count = $incorrectCount;
                $attempt->percentage = $percentage;

                return $attempt;
            })
            ->sortByDesc('score')
            ->values()
            ->map(function ($r, $i) {
                $r['rank'] = $i + 1;
                return $r;
            });

        $percentages = $attempts->pluck('percentage');
        
        $stats = [
            'rata_rata' => $percentages->avg(),
            'tertinggi' => $percentages->max(),
            'terendah' => $percentages->min(),
            'total_peserta' => $percentages->count(),
        ];

        $pdf = Pdf::loadView('reports.exam-results', [
            'exam' => $exam,
            'attempts' => $attempts,
            'stats' => $stats,
        ])->setPaper('a4', 'portrait');

        return $pdf->download("exam-{$exam->id}-results.pdf");
    }
}

