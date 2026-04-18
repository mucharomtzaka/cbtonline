<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function show(Exam $exam)
    {
        $exam->loadCount('examQuestions');
        return response()->json(['exam' => $exam]);
    }

    public function update(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'in:draft,active,closed'],
            'duration_seconds' => ['nullable', 'integer', 'min:30'],
            'attempt_limit' => ['nullable', 'integer', 'min:1', 'max:20'],
            'randomize_questions' => ['nullable', 'boolean'],
            'randomize_options' => ['nullable', 'boolean'],
            'auto_submit_on_timeout' => ['nullable', 'boolean'],
            'show_result_after_submit' => ['nullable', 'boolean'],
            'show_result_after_end' => ['nullable', 'boolean'],
        ]);

        $exam->update(array_filter($data));
        return response()->json(['exam' => $exam->fresh()]);
    }

    public function destroy(Exam $exam)
    {
        $exam->delete();
        return response()->json(['ok' => true]);
    }

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $perPage = match ($perPage) {
            5 => 5,
            10 => 10,
            25 => 25,
            50 => 50,
            default => 10,
        };

        $query = Exam::query()
            ->withCount('examQuestions')
            ->withCount('registrations')
            ->orderByDesc('id');

        $status = $request->query('status');
        if ($status) {
            $query->where('status', $status);
        }

        $search = $request->query('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $exams = $query->paginate($perPage);

        return response()->json($exams);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_seconds' => ['nullable', 'integer', 'min:30'],
            'attempt_limit' => ['required', 'integer', 'min:1', 'max:20'],
            'allow_retake' => ['nullable', 'boolean'],
            'randomize_questions' => ['required', 'boolean'],
            'randomize_options' => ['required', 'boolean'],
            'auto_submit_on_timeout' => ['required', 'boolean'],
            'show_result_after_submit' => ['required', 'boolean'],
            'show_result_after_end' => ['required', 'boolean'],
            'question_ids' => ['nullable', 'array'],
            'question_ids.*' => ['integer'],
        ]);

        $exam = Exam::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'owner_user_id' => $request->user()->id,
            'duration_seconds' => $data['duration_seconds'] ?? null,
            'attempt_limit' => $data['attempt_limit'],
            'allow_retake' => $data['allow_retake'] ?? false,
            'randomize_questions' => $data['randomize_questions'],
            'randomize_options' => $data['randomize_options'],
            'auto_submit_on_timeout' => $data['auto_submit_on_timeout'],
            'show_result_after_submit' => $data['show_result_after_submit'],
            'show_result_after_end' => $data['show_result_after_end'],
        ]);

        if (!empty($data['question_ids'])) {
            foreach ($data['question_ids'] as $questionId) {
                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $questionId,
                    'points' => 1,
                ]);
            }
        }

        return response()->json(['exam' => $exam->loadCount('examQuestions')], 201);
    }
}

