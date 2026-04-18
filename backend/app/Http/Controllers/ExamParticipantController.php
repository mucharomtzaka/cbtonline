<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAttendance;
use App\Models\ExamAttempt;
use App\Models\ExamRegistration;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class ExamParticipantController extends Controller
{
    public function index(Request $request, Exam $exam)
    {
        $rows = ExamRegistration::query()
            ->where('exam_id', $exam->id)
            ->with('user:id,name,username,email')
            ->orderByDesc('id')
            ->get()
            ->map(function ($reg) use ($exam) {
                // Get attendance status
                $attendance = \App\Models\ExamAttendance::query()
                    ->where('exam_id', $exam->id)
                    ->where('user_id', $reg->user_id)
                    ->first();

                // Check if has started attempt
                $attempt = \App\Models\ExamAttempt::query()
                    ->where('exam_id', $exam->id)
                    ->where('user_id', $reg->user_id)
                    ->exists();

                if ($attempt) {
                    $status = 'started';
                } elseif ($attendance && $attendance->status === 'present') {
                    $status = 'present';
                } else {
                    $status = 'registered';
                }

                return [
                    'id' => $reg->id,
                    'exam_id' => $reg->exam_id,
                    'user_id' => $reg->user_id,
                    'user' => [
                        'name' => $reg->user->name,
                        'username' => $reg->user->username,
                        'email' => $reg->user->email,
                    ],
                    'status' => $status,
                    'created_at' => $reg->created_at,
                ];
            });

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function registerUser(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
        ]);

        $this->registerSingle($exam, $data['user_id'], $data['group_id'] ?? null);

        return response()->json(['ok' => true]);
    }

    private function registerSingle(Exam $exam, int $userId, ?int $groupId = null)
    {
        ExamRegistration::query()->updateOrCreate(
            ['exam_id' => $exam->id, 'user_id' => $userId],
            ['group_id' => $groupId]
        );

        ExamAttendance::query()->firstOrCreate(
            ['exam_id' => $exam->id, 'user_id' => $userId],
            ['status' => 'absent']
        );
    }

    public function importFromGroup(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'group_id' => ['required', 'integer', 'exists:groups,id'],
        ]);

        $group = \App\Models\Group::query()->findOrFail($data['group_id']);
        $userIds = $group->users()->pluck('users.id');

        foreach ($userIds as $userId) {
            $this->registerSingle($exam, $userId, $group->id);
        }

        return response()->json(['ok' => true, 'count' => $userIds->count()]);
    }

    public function unregisterUser(Request $request, Exam $exam, ExamRegistration $registration)
    {
        $registration->delete();
        return response()->json(['ok' => true]);
    }

    public function attendanceList(Request $request, Exam $exam)
    {
        $rows = ExamAttendance::query()
            ->where('exam_id', $exam->id)
            ->with('user:id,name,username,email')
            ->orderBy('user_id')
            ->paginate(50);

        return response()->json($rows);
    }

    public function markPresent(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'status' => ['required', 'in:present,absent'],
        ]);

        $row = ExamAttendance::query()->updateOrCreate(
            ['exam_id' => $exam->id, 'user_id' => $data['user_id']],
            []
        );

        $row->update([
            'status' => $data['status'],
            'marked_at' => CarbonImmutable::now(),
            'marked_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['exam_attendance' => $row->fresh()], 201);
    }
}

