<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAccessToken;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExamTokenController extends Controller
{
    public function index(Request $request, Exam $exam)
    {
        $perPage = $request->integer('per_page', 10);
        $perPage = match ($perPage) {
            5 => 5,
            10 => 10,
            25 => 25,
            50 => 50,
            default => 10,
        };

        $tokens = ExamAccessToken::query()
            ->where('exam_id', $exam->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($tokens);
    }

    public function store(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'expires_at' => ['nullable', 'date'],
        ]);

        $token = ExamAccessToken::create([
            'exam_id' => $exam->id,
            'token' => strtoupper(Str::random(8)),
            'is_active' => true,
            'expires_at' => $data['expires_at'] ?? null,
            'generated_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['exam_access_token' => $token], 201);
    }

    public function destroy(Request $request, Exam $exam, string $token)
    {
        $token = ExamAccessToken::where('exam_id', $exam->id)
            ->where('id', $token)
            ->firstOrFail();
        $token->delete();
        return response()->json(['ok' => true]);
    }
}

