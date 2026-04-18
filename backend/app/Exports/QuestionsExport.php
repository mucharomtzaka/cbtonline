<?php

namespace App\Exports;

use App\Models\Question;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class QuestionsExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private int $questionBankId)
    {
    }

    public function collection(): Collection
    {
        return Question::query()
            ->where('question_bank_id', $this->questionBankId)
            ->orderBy('id')
            ->get();
    }

    public function headings(): array
    {
        return [
            'type',
            'prompt',
            'option_a',
            'option_b',
            'option_c',
            'option_d',
            'correct_choice', // a|b|c|d
            'correct_true_false', // true|false
            'matching_pairs_json', // [{"left":"...","right":"..."}]
            'explanation',
            'difficulty',
        ];
    }

    /**
     * @param  mixed  $row
     */
    public function map($row): array
    {
        $options = is_array($row->options) ? $row->options : [];
        $getOpt = function (int $idx) use ($options) {
            $opt = $options[$idx] ?? null;
            if (is_array($opt)) {
                return $opt['label'] ?? $opt['value'] ?? null;
            }

            return $opt;
        };

        $correctChoice = $row->correct_answer['choice'] ?? null;
        $tf = $row->correct_answer['value'] ?? null;

        return [
            $row->type,
            $row->prompt,
            $getOpt(0),
            $getOpt(1),
            $getOpt(2),
            $getOpt(3),
            $correctChoice,
            is_bool($tf) ? ($tf ? 'true' : 'false') : null,
            $row->type === 'matching' ? json_encode($row->options ?? [], JSON_UNESCAPED_UNICODE) : null,
            $row->explanation,
            $row->difficulty,
        ];
    }
}

