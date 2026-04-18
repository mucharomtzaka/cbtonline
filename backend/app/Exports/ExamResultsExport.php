<?php

namespace App\Exports;

use App\Models\ExamAttempt;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ExamResultsExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private int $examId)
    {
    }

    public function collection(): Collection
    {
        // Get attempts with answers for correct/incorrect count
        $attempts = ExamAttempt::query()
            ->where('exam_id', $this->examId)
            ->whereIn('status', ['submitted', 'auto_submitted', 'graded'])
            ->with('user:id,name,username,email')
            ->with('answers')
            ->get()
            ->map(function ($attempt) {
                $correctCount = $attempt->answers->filter(fn($a) => $a->is_correct === true)->count();
                $incorrectCount = $attempt->answers->filter(fn($a) => $a->is_correct === false)->count();
                $maxScore = (int) $attempt->max_score;
                $score = (int) $attempt->score;
                $percentage = $maxScore > 0 ? round(($score / $maxScore) * 100) : 0;

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

        return $attempts;
    }

    public function headings(): array
    {
        return [
            'Rank',
            'Nama',
            'Username',
            'Email',
            'Benar',
            'Salah',
            'Score',
            'Max Score',
            'Persentase',
            'Status',
            'Mulai',
            'Selesai',
        ];
    }

    /**
     * @param  mixed  $row
     */
    public function map($row): array
    {
        return [
            $row->rank,
            $row->user?->name,
            $row->user?->username,
            $row->user?->email,
            $row->correct_count ?? 0,
            $row->incorrect_count ?? 0,
            (int) $row->score,
            (int) $row->max_score,
            $row->percentage !== null ? (int) round($row->percentage) : 0,
            $row->status,
            optional($row->started_at)->toDateTimeString(),
            optional($row->submitted_at)->toDateTimeString(),
        ];
    }
}

