<?php

namespace App\Imports;

use App\Models\Question;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;

class QuestionsImport implements ToCollection, WithHeadingRow
{
    public int $created = 0;
    public int $skipped = 0;

    public function __construct(private int $questionBankId)
    {
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            $type = Str::of((string) ($row['type'] ?? ''))->trim()->lower()->value();
            $prompt = trim((string) ($row['prompt'] ?? ''));

            if ($type === '' || $prompt === '') {
                $this->skipped++;
                continue;
            }

            if (!in_array($type, ['multiple_choice', 'multiple_choice_multiple', 'essay', 'true_false', 'matching'], true)) {
                $this->skipped++;
                continue;
            }

            [$options, $correct] = $this->buildPayload($type, $row);

            Question::create([
                'question_bank_id' => $this->questionBankId,
                'type' => $type,
                'prompt' => $prompt,
                'options' => $options,
                'correct_answer' => $correct,
                'explanation' => $this->nullIfEmpty($row['explanation'] ?? null),
                'difficulty' => $this->intOrNull($row['difficulty'] ?? null),
                'meta' => null,
            ]);

            $this->created++;
        }
    }

    private function buildPayload(string $type, $row): array
    {
        if ($type === 'multiple_choice') {
            $optA = $this->nullIfEmpty($row['option_a'] ?? null);
            $optB = $this->nullIfEmpty($row['option_b'] ?? null);
            $optC = $this->nullIfEmpty($row['option_c'] ?? null);
            $optD = $this->nullIfEmpty($row['option_d'] ?? null);

            $options = [];
            if ($optA !== null) $options[] = ['value' => 'a', 'label' => $optA];
            if ($optB !== null) $options[] = ['value' => 'b', 'label' => $optB];
            if ($optC !== null) $options[] = ['value' => 'c', 'label' => $optC];
            if ($optD !== null) $options[] = ['value' => 'd', 'label' => $optD];

            $choice = Str::of((string) ($row['correct_choice'] ?? ''))->trim()->lower()->value();
            $correct = $choice !== '' ? ['choice' => $choice] : null;

            return [$options ?: null, $correct];
        }

        if ($type === 'multiple_choice_multiple') {
            $optA = $this->nullIfEmpty($row['option_a'] ?? null);
            $optB = $this->nullIfEmpty($row['option_b'] ?? null);
            $optC = $this->nullIfEmpty($row['option_c'] ?? null);
            $optD = $this->nullIfEmpty($row['option_d'] ?? null);

            $options = [];
            if ($optA !== null) $options[] = ['value' => 'a', 'label' => $optA];
            if ($optB !== null) $options[] = ['value' => 'b', 'label' => $optB];
            if ($optC !== null) $options[] = ['value' => 'c', 'label' => $optC];
            if ($optD !== null) $options[] = ['value' => 'd', 'label' => $optD];

            // Parse multiple correct answers (e.g., "a,c" or "a,b,c")
            $choice = Str::of((string) ($row['correct_choice'] ?? ''))->trim()->lower()->value();
            $correctChoices = [];
            if ($choice !== '') {
                $parts = explode(',', $choice);
                foreach ($parts as $p) {
                    $p = trim($p);
                    if (in_array($p, ['a', 'b', 'c', 'd'])) {
                        $correctChoices[] = $p;
                    }
                }
            }
            $correct = !empty($correctChoices) ? ['choices' => $correctChoices] : null;

            return [$options ?: null, $correct];
        }

        if ($type === 'true_false') {
            $tf = Str::of((string) ($row['correct_true_false'] ?? ''))->trim()->lower()->value();
            $correct = null;
            if ($tf === 'true' || $tf === 'false') {
                $correct = ['value' => $tf === 'true'];
            }

            return [null, $correct];
        }

        if ($type === 'matching') {
            $json = $this->nullIfEmpty($row['matching_pairs_json'] ?? null);
            if (!$json) {
                return [null, null];
            }

            $pairs = json_decode($json, true);
            if (!is_array($pairs)) {
                return [null, null];
            }

            // store pairs as options; correct_answer pairs is identical for now
            return [$pairs, ['pairs' => Arr::mapWithKeys($pairs, function ($p, $i) {
                if (!is_array($p)) return [$i => null];
                return [$i => $p];
            })]];
        }

        // essay
        return [null, null];
    }

    private function nullIfEmpty($v): ?string
    {
        $s = trim((string) ($v ?? ''));
        return $s === '' ? null : $s;
    }

    private function intOrNull($v): ?int
    {
        if ($v === null) return null;
        $s = trim((string) $v);
        if ($s === '') return null;
        if (!is_numeric($s)) return null;
        return (int) $s;
    }
}

