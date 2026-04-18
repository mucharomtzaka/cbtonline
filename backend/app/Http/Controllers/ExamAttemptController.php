<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAccessToken;
use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use App\Models\ExamAttemptEvent;
use App\Models\Question;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ExamAttemptController extends Controller
{
    public function start(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'access_token' => ['required', 'string'],
        ]);

        $token = ExamAccessToken::query()
            ->where('exam_id', $exam->id)
            ->where('token', $data['access_token'])
            ->where('is_active', true)
            ->first();

        if (!$token || ($token->expires_at && $token->expires_at->isPast())) {
            return response()->json(['message' => 'Token ujian tidak valid / sudah kedaluwarsa.'], 422);
        }

        $attemptCount = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $request->user()->id)
            ->count();

        if ($attemptCount >= $exam->attempt_limit) {
            return response()->json(['message' => 'Batas percobaan sudah tercapai.'], 422);
        }

        $now = CarbonImmutable::now();

        // schedule enforcement (if schedules exist)
        $hasSchedule = $exam->schedules()->exists();
        if ($hasSchedule) {
            $isWithin = $exam->schedules()
                ->where('starts_at', '<=', $now)
                ->where('ends_at', '>=', $now)
                ->exists();
            if (!$isWithin) {
                return response()->json(['message' => 'Ujian belum dibuka / sudah ditutup (di luar jadwal).'], 422);
            }
        }

        return DB::transaction(function () use ($request, $exam, $now) {
            $attempt = ExamAttempt::create([
                'exam_id' => $exam->id,
                'user_id' => $request->user()->id,
                'status' => 'in_progress',
                'started_at' => $now,
                'duration_seconds' => $exam->duration_seconds,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $questions = Question::query()
                ->select('questions.*')
                ->join('exam_questions', 'exam_questions.question_id', '=', 'questions.id')
                ->where('exam_questions.exam_id', $exam->id)
                ->get();

            $questionList = $questions->all();
            if ($exam->randomize_questions) {
                shuffle($questionList);
            }

            $maxScore = 0;
            foreach ($questionList as $q) {
                // points per question (default 1 for now)
                $maxScore += 1;
                ExamAttemptAnswer::create([
                    'exam_attempt_id' => $attempt->id,
                    'question_id' => $q->id,
                    'answer' => null,
                    'is_correct' => null,
                    'score_awarded' => null,
                ]);
            }

            $attempt->update(['max_score' => $maxScore]);

            $payloadQuestions = array_map(function (Question $q) use ($exam) {
                $options = $q->options;
                if ($exam->randomize_options && is_array($options) && in_array($q->type, ['multiple_choice', 'matching'], true)) {
                    $shuffled = $options;
                    shuffle($shuffled);
                    $options = $shuffled;
                }

                return [
                    'id' => $q->id,
                    'type' => $q->type,
                    'prompt' => $q->prompt,
                    'options' => $options,
                    'meta' => $q->meta,
                    'media_type' => $q->media_type,
                    'media_url' => $q->media_url,
                    'media_caption' => $q->media_caption,
                ];
            }, $questionList);

            return response()->json([
                'attempt' => [
                    'id' => $attempt->id,
                    'exam_id' => $exam->id,
                    'started_at' => $attempt->started_at,
                    'duration_seconds' => $attempt->duration_seconds,
                    'max_score' => $attempt->max_score,
                    'status' => $attempt->status,
                ],
                'exam' => Arr::only($exam->toArray(), [
                    'id',
                    'title',
                    'description',
                    'duration_seconds',
                    'randomize_questions',
                    'randomize_options',
                    'auto_submit_on_timeout',
                ]),
                'questions' => $payloadQuestions,
            ], 201);
        });
    }

    public function show(Request $request, ExamAttempt $examAttempt)
    {
        if ($examAttempt->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $exam = $examAttempt->exam()->firstOrFail();

        $questions = Question::query()
            ->select('questions.*')
            ->join('exam_questions', 'exam_questions.question_id', '=', 'questions.id')
            ->where('exam_questions.exam_id', $exam->id)
            ->get();

        $questionList = $questions->all();
        if ($exam->randomize_questions) {
            shuffle($questionList);
        }

        $payloadQuestions = array_map(function (Question $q) use ($exam) {
            $options = $q->options;
            if ($exam->randomize_options && is_array($options) && in_array($q->type, ['multiple_choice', 'matching'], true)) {
                $shuffled = $options;
                shuffle($shuffled);
                $options = $shuffled;
            }

            return [
                'id' => $q->id,
                'type' => $q->type,
                'prompt' => $q->prompt,
                'options' => $options,
                'meta' => $q->meta,
                'media_type' => $q->media_type,
                'media_url' => $q->media_url,
                'media_caption' => $q->media_caption,
            ];
        }, $questionList);

        $answers = $examAttempt->answers->map(function ($a) {
            return [
                'question_id' => $a->question_id,
                'answer' => $a->answer,
            ];
        });

        return response()->json([
            'attempt' => [
                'id' => $examAttempt->id,
                'exam_id' => $exam->id,
                'started_at' => $examAttempt->started_at,
                'duration_seconds' => $examAttempt->duration_seconds,
                'max_score' => $examAttempt->max_score,
                'status' => $examAttempt->status,
                'score' => $examAttempt->score,
            ],
            'exam' => Arr::only($exam->toArray(), [
                'id',
                'title',
                'description',
                'duration_seconds',
                'randomize_questions',
                'randomize_options',
                'auto_submit_on_timeout',
                'show_result_after_submit',
                'show_result_after_end',
            ]),
            'questions' => $payloadQuestions,
            'answers' => $answers,
        ]);
    }

    public function saveAnswer(Request $request, ExamAttempt $examAttempt)
    {
        if ($examAttempt->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($examAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Attempt sudah selesai.'], 422);
        }

        $exam = $examAttempt->exam()->firstOrFail();
        if ($this->isTimedOut($examAttempt, $exam)) {
            $this->autoSubmitAttempt($examAttempt, $exam);
            return response()->json(['message' => 'Waktu habis. Attempt sudah auto-submit.'], 422);
        }

        $data = $request->validate([
            'question_id' => ['required', 'integer', 'exists:questions,id'],
            'answer' => ['nullable', 'array'],
        ]);

        $row = ExamAttemptAnswer::query()
            ->where('exam_attempt_id', $examAttempt->id)
            ->where('question_id', $data['question_id'])
            ->firstOrFail();

        $row->update([
            'answer' => $data['answer'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function submit(Request $request, ExamAttempt $examAttempt)
    {
        if ($examAttempt->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($examAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Attempt sudah selesai.'], 422);
        }

        $exam = $examAttempt->exam()->firstOrFail();

        return DB::transaction(function () use ($examAttempt, $exam) {
            $answers = ExamAttemptAnswer::query()
                ->where('exam_attempt_id', $examAttempt->id)
                ->with('question')
                ->get();

            $score = 0;
            foreach ($answers as $a) {
                $q = $a->question;

                if (!$q) {
                    continue;
                }

                $autoGradable = in_array($q->type, ['multiple_choice', 'true_false', 'matching', 'multiple_choice_multiple'], true);

                if (!$autoGradable) {
                    $a->update([
                        'is_correct' => null,
                        'score_awarded' => null,
                    ]);
                    continue;
                }

                $correctFormatted = $this->prepareCorrectAnswer($q);
                $isCorrect = $this->compareAnswer($q->type, $correctFormatted, $a->answer);
                $answerGiven = $a->answer !== null && (isset($a->answer['choice']) || isset($a->answer['value']) || isset($a->answer['text']) || isset($a->answer['pairs']) || isset($a->answer['choices']));
                
                // Calculate score based on scoring type
                $awarded = $this->calculateScore($exam, $isCorrect, $answerGiven);
                $weight = $exam->question_weight ?? 1;

                $a->update([
                    'is_correct' => $isCorrect,
                    'score_awarded' => $awarded * $weight,
                ]);

                $score += $awarded * $weight;
            }

            $examAttempt->update([
                'status' => 'submitted',
                'submitted_at' => CarbonImmutable::now(),
                'score' => $score,
            ]);

            // Load answers with question for detailed results
            $examAttempt->load('answers.question');

            return response()->json([
                'attempt' => $examAttempt->fresh(),
                'results' => $answers->map(function ($a) {
                    return [
                        'question_id' => $a->question_id,
                        'question' => $a->question ? [
                            'id' => $a->question->id,
                            'type' => $a->question->type,
                            'prompt' => $a->question->prompt,
                            'options' => $a->question->options,
                            'correct_answer' => $a->question->correct_answer,
                        ] : null,
                        'answer' => $a->answer,
                        'is_correct' => $a->is_correct,
                        'score_awarded' => $a->score_awarded,
                    ];
                }),
            ]);
        });
    }

    public function logEvent(Request $request, ExamAttempt $examAttempt)
    {
        if ($examAttempt->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'payload' => ['nullable', 'array'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        ExamAttemptEvent::create([
            'exam_attempt_id' => $examAttempt->id,
            'type' => $data['type'],
            'payload' => $data['payload'] ?? null,
            'occurred_at' => isset($data['occurred_at']) ? CarbonImmutable::parse($data['occurred_at']) : CarbonImmutable::now(),
        ]);

        return response()->json(['ok' => true], 201);
    }

    /**
     * Reset/retake exam - delete user's attempts for this exam
     */
    public function reset(Request $request, Exam $exam)
    {
        $user = $request->user();
        
        // Check exam allows retake
        if (!$exam->allow_retake) {
            return response()->json(['message' => 'Ujian ini tidak memungkinkan pengulangan'], 403);
        }

        // Count existing attempts
        $existingAttempts = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->where('status', 'submitted')
            ->count();

        if ($existingAttempts > 0) {
            // Check attempt limit
            if ($exam->attempt_limit && $existingAttempts >= $exam->attempt_limit) {
                return response()->json(['message' => 'Batas attempt tercapai'], 403);
            }
        }

        // Delete in_progress attempts to allow new start
        ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->delete();

        // Delete submitted attempts if retake allowed
        if ($exam->allow_retake) {
            ExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->where('user_id', $user->id)
                ->delete();
        }

        return response()->json(['message' => 'Success']);
    }

    /**
     * Get user's attempt status for an exam
     */
    public function status(Request $request, Exam $exam)
    {
        $user = $request->user();
        
        $attempts = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'status' => $a->status,
                'score' => $a->score,
                'started_at' => $a->started_at,
                'submitted_at' => $a->submitted_at,
            ]);

        return response()->json(['attempts' => $attempts]);
    }

    /**
     * Getpeserta's own result for an exam
     */
    public function myResult(Request $request, Exam $exam)
    {
        $user = $request->user();
        
        $attempt = ExamAttempt::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->orderByDesc('final_score')
            ->first();

        if (!$attempt) {
            return response()->json(['message' => 'No submitted attempt found'], 404);
        }

        // Get questions from exam_questions relationship
        $questions = $exam->examQuestions()
            ->with('question')
            ->orderBy('fixed_order')
            ->get()
            ->map(function ($eq) use ($attempt) {
                $q = $eq->question;
                if (!$q) {
                    return null;
                }
                $answer = $attempt->answers->firstWhere('question_id', $q->id);
                $options = $q->options ?? [];
                $correctAnswer = $q->correct_answer;
                
                // Format correct answer text
                $correctText = '';
                if ($q->type === 'multiple_choice') {
                    $idx = is_array($correctAnswer) ? ($correctAnswer[0] ?? null) : (is_numeric($correctAnswer) ? $correctAnswer : null);
                    $correctText = $idx !== null && isset($options[$idx]) ? $options[$idx] : (string) ($idx ?? '');
                } elseif ($q->type === 'true_false') {
                    // Check if correct_answer is true/1 or false/0 and map to options
                    $val = is_bool($correctAnswer) ? $correctAnswer : ($correctAnswer == '1' || $correctAnswer === true);
                    // Options for true_false: [0] = salah, [1] = benar
                    $correctText = $val ? ($options[1] ?? 'Benar') : ($options[0] ?? 'Salah');
                } elseif ($q->type === 'essay') {
                    $correctText = is_string($correctAnswer) ? $correctAnswer : '';
                } elseif ($q->type === 'multiple_choice_multiple') {
                    // Handle both array format [0,1,2] and object format ['choices'=>[0,1,2]]
                    $choices = [];
                    if (is_array($correctAnswer)) {
                        if (isset($correctAnswer['choices'])) {
                            $choices = $correctAnswer['choices'];
                        } else {
                            // Plain array format [0,1,2]
                            $choices = $correctAnswer;
                        }
                    }
                    $parts = [];
                    foreach ($choices as $idx) {
                        if (isset($options[$idx])) {
                            $parts[] = $options[$idx];
                        }
                    }
                    $correctText = implode(', ', $parts);
                } elseif ($q->type === 'matching') {
                    // matching options format: [[sources], [targets]]
                    $sources = $options[0] ?? [];
                    $targets = $options[1] ?? [];
                    $correctArray = is_array($correctAnswer) ? $correctAnswer : json_decode($correctAnswer, true);
                    $parts = [];
                    if (is_array($correctArray)) {
                        foreach ($correctArray as $sourceIdx => $targetIdx) {
                            $sourceText = isset($sources[$sourceIdx]) ? $sources[$sourceIdx] : "Source $sourceIdx";
                            $targetText = isset($targets[$targetIdx]) ? $targets[$targetIdx] : "Target $targetIdx";
                            $parts[] = "$sourceText → $targetText";
                        }
                    }
                    $correctText = implode(', ', $parts);
                } else {
                    $correctText = is_string($correctAnswer) ? $correctAnswer : json_encode($correctAnswer);
                }
                
                return [
                    'id' => $q->id,
                    'type' => $q->type,
                    'prompt' => $q->prompt,
                    'options' => $options,
                    'answer' => $answer?->answer,
                    'correct_answer' => $correctText,
                    'is_correct' => $answer?->is_correct,
                    'score_awarded' => $answer?->score_awarded,
                    'explanation' => $q->explanation,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'attempt' => [
                'id' => $attempt->id,
                'score' => (int) (($attempt->final_score !== null && $attempt->final_score > 0) ? $attempt->final_score : $attempt->score),
                'max_score' => (int) $attempt->max_score,
                'final_score' => (int) (($attempt->final_score !== null && $attempt->final_score > 0) ? $attempt->final_score : $attempt->score),
                'manual_score' => (int) ($attempt->manual_score ?? 0),
                'submitted_at' => $attempt->submitted_at?->toIso8601String(),
            ],
            'exam' => [
                'id' => $exam->id,
                'title' => $exam->title,
                'show_result_after_submit' => $exam->show_result_after_submit,
                'show_result_after_end' => $exam->show_result_after_end,
            ],
            'questions' => $questions,
        ]);
    }

    /**
     * Reset all participants' attempts (admin/guru only)
     */
    public function resetAll(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer'],
        ]);

        $query = ExamAttempt::query()
            ->where('exam_id', $exam->id);

        if (!empty($data['user_id'])) {
            $query->where('user_id', $data['user_id']);
        }

        $deleted = $query->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$deleted} attempt(s)",
            'deleted' => $deleted,
        ]);
    }

    private function compareAnswer(string $type, ?array $correct, ?array $given): bool
    {
        $correct = $correct ?? [];
        $given = $given ?? [];

        if ($type === 'true_false') {
            return Arr::get($correct, 'value') == Arr::get($given, 'value');
        }

        if ($type === 'multiple_choice') {
            $correctChoice = Arr::get($correct, 'choice');
            $givenChoice = Arr::get($given, 'choice');
            return (string) $correctChoice === (string) $givenChoice;
        }

        if ($type === 'matching') {
            $c = Arr::get($correct, 'pairs', []);
            $g = Arr::get($given, 'pairs', []);

            if (!is_array($c) || !is_array($g)) {
                return false;
            }

            $c = array_map('strval', $c);
            $g = array_map('strval', $g);

            ksort($c);
            ksort($g);

            return $c === $g;
        }

        if ($type === 'multiple_choice_multiple') {
            $c = Arr::get($correct, 'choices', []);
            $g = Arr::get($given, 'choices', []);

            if (!is_array($c) || !is_array($g)) {
                return false;
            }

            $c = array_map('strval', $c);
            $g = array_map('strval', $g);

            sort($c);
            sort($g);

            return $c === $g;
        }

        return false;
    }

    private function prepareCorrectAnswer(Question $q): ?array
    {
        if ($q->type === 'multiple_choice') {
            if (is_numeric($q->correct_answer)) {
                return ['choice' => (int) $q->correct_answer];
            }

            $optIdx = array_search($q->correct_answer, $q->options ?? []);
            return $optIdx !== false ? ['choice' => $optIdx] : null;
        }

        if ($q->type === 'true_false') {
            return ['value' => $q->correct_answer];
        }

        if ($q->type === 'matching') {
            $pairs = is_string($q->correct_answer) ? json_decode($q->correct_answer, true) : $q->correct_answer;
            return ['pairs' => is_array($pairs) ? $pairs : []];
        }

        if ($q->type === 'multiple_choice_multiple') {
            $choices = is_string($q->correct_answer) ? json_decode($q->correct_answer, true) : $q->correct_answer;
            return ['choices' => is_array($choices) ? $choices : []];
        }

        if (is_array($q->correct_answer)) {
            return $q->correct_answer;
        }

        if ($q->correct_answer !== null) {
            $optIdx = array_search($q->correct_answer, $q->options ?? []);
            return $optIdx !== false ? ['choice' => $optIdx] : null;
        }

        return null;
    }

    /**
     * Calculate score based on exam's scoring type
     */
    private function calculateScore(Exam $exam, bool $isCorrect, bool $answerGiven): float
    {
        $scoringType = $exam->scoring_type ?? 'simple';

        // No answer given = 0 for all scoring types
        if (!$answerGiven) {
            return 0;
        }

        switch ($scoringType) {
            case 'simple':
                // Simple: +1 for correct, 0 for incorrect
                return $isCorrect ? 1 : 0;

            case 'negative':
                // Negative: +1 for correct, negative_mark for incorrect
                $negativeMark = $exam->negative_mark ?? 0.25;
                return $isCorrect ? 1 : -$negativeMark;

            case 'weighted':
                // Weighted: handled by question_weight in the scoring
                return $isCorrect ? 1 : 0;

            default:
                return $isCorrect ? 1 : 0;
        }
    }

    private function isTimedOut(ExamAttempt $attempt, Exam $exam): bool
    {
        if (!$exam->duration_seconds) {
            return false;
        }

        $deadline = $attempt->started_at->addSeconds($exam->duration_seconds);

        return CarbonImmutable::now()->greaterThan($deadline);
    }

    private function autoSubmitAttempt(ExamAttempt $attempt, Exam $exam): void
    {
        if ($attempt->status !== 'in_progress') {
            return;
        }

        if (!$exam->auto_submit_on_timeout) {
            return;
        }

        DB::transaction(function () use ($attempt, $exam) {
            $answers = ExamAttemptAnswer::query()
                ->where('exam_attempt_id', $attempt->id)
                ->with('question')
                ->get();

            $score = 0;
            foreach ($answers as $a) {
                $q = $a->question;
                if (!$q) continue;

                $autoGradable = in_array($q->type, ['multiple_choice', 'true_false', 'matching', 'multiple_choice_multiple'], true);
                if (!$autoGradable) {
                    $a->update(['is_correct' => null, 'score_awarded' => null]);
                    continue;
                }

                $correctFormatted = $this->prepareCorrectAnswer($q);
                $isCorrect = $this->compareAnswer($q->type, $correctFormatted, $a->answer);
                $answerGiven = $a->answer !== null && (isset($a->answer['choice']) || isset($a->answer['value']) || isset($a->answer['text']) || isset($a->answer['pairs']) || isset($a->answer['choices']));
                $weight = $exam->question_weight ?? 1;
                $awarded = $this->calculateScore($exam, $isCorrect, $answerGiven);
                $a->update(['is_correct' => $isCorrect, 'score_awarded' => $awarded * $weight]);
                $score += $awarded * $weight;
            }

            $attempt->update([
                'status' => 'auto_submitted',
                'submitted_at' => CarbonImmutable::now(),
                'score' => $score,
            ]);
        });
    }
}

