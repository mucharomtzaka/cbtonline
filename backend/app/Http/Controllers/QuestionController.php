<?php

namespace App\Http\Controllers;

use App\Exports\QuestionsExport;
use App\Imports\QuestionsImport;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\ExamQuestion;
use App\Models\Exam;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class QuestionController extends Controller
{
    public function examQuestions(Request $request, Exam $exam)
    {
        $examQuestions = $exam->examQuestions()
            ->with('question')
            ->orderBy('fixed_order')
            ->get();

        $formatted = $examQuestions->map(function ($eq) {
            return [
                'id' => $eq->id,
                'order' => $eq->fixed_order,
                'question' => [
                    'id' => $eq->question->id,
                    'question' => $eq->question->prompt,
                    'question_type' => $eq->question->type,
                    'media_type' => $eq->question->media_type,
                    'media_url' => $eq->question->media_url,
                    'media_caption' => $eq->question->media_caption,
                    'options' => $eq->question->options,
                    'correct_answer' => $eq->question->correct_answer,
                ],
            ];
        });

        return response()->json(['data' => $formatted]);
    }

    public function index(Request $request, QuestionBank $questionBank)
    {
        $perPage = $request->integer('per_page', 10);
        $perPage = match ($perPage) {
            5 => 5,
            10 => 10,
            25 => 25,
            50 => 50,
            100 => 100,
            200 => 200,
            default => 10,
        };

        $questions = Question::query()
            ->where('question_bank_id', $questionBank->id)
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->orderByDesc('id')
            ->paginate($perPage);

        $formatted = $questions->getCollection()->map(function ($q) {
            return [
                'id' => $q->id,
                'question' => $q->prompt,
                'question_type' => $q->type,
                'media_type' => $q->media_type,
                'media_url' => $q->media_url,
                'media_caption' => $q->media_caption,
                'options' => $q->options,
                'correct_answer' => $q->correct_answer,
                'explanation' => $q->explanation,
                'matching_pairs' => $q->meta['matching_pairs'] ?? null,
                'created_at' => $q->created_at?->toIso8601String(),
            ];
        });

        $questions->setCollection($formatted);

        return response()->json($questions);
    }

    public function store(Request $request, QuestionBank $questionBank)
    {
        $data = $request->validate([
            'question_type' => ['required', 'in:multiple_choice,multiple_choice_multiple,true_false,essay,matching'],
            'question' => ['required', 'string'],
            'media_type' => ['nullable', 'in:image,audio,video'],
            'media_url' => ['nullable', 'string'],
            'media_caption' => ['nullable', 'string'],
            'explanation' => ['nullable', 'string'],
        ]);

        $type = $data['question_type'];
        $createData = [
            'type' => $type,
            'prompt' => $data['question'],
            'question_bank_id' => $questionBank->id,
            'media_type' => $data['media_type'] ?? null,
            'media_url' => $data['media_url'] ?? null,
            'media_caption' => $data['media_caption'] ?? null,
            'explanation' => $data['explanation'] ?? null,
        ];

        if ($type === 'multiple_choice') {
            $options = $request->validate([
                'options' => ['required', 'array', 'size:4'],
                'options.*' => ['required', 'string'],
            ])['options'];
            $correct = $request->validate([
                'correct_answer' => ['required', 'integer', 'min:0', 'max:3'],
            ])['correct_answer'];
            $createData['options'] = $options;
            $createData['correct_answer'] = $correct;
        } elseif ($type === 'true_false') {
            $correct = $request->validate([
                'correct_answer' => ['required', 'in:true,false'],
            ])['correct_answer'];
            $createData['correct_answer'] = $correct;
        } elseif ($type === 'matching') {
            $pairs = $request->validate([
                'matching_pairs' => ['required', 'array'],
            ])['matching_pairs'];
            $createData['meta'] = ['matching_pairs' => $pairs];
        }

        $question = Question::create($createData);

        return response()->json(['data' => $question], 201);
    }

    public function update(Request $request, QuestionBank $questionBank, Question $question)
    {
        $data = $request->validate([
            'question_type' => ['sometimes', 'in:multiple_choice,true_false,essay,matching'],
            'question' => ['required', 'string'],
            'explanation' => ['nullable', 'string'],
        ]);

        $type = $data['question_type'] ?? $question->type;
        $updateData = [
            'prompt' => $data['question'],
            'explanation' => $data['explanation'] ?? null,
        ];

        if ($type === 'multiple_choice') {
            $options = $request->validate([
                'options' => ['required', 'array', 'size:4'],
                'options.*' => ['required', 'string'],
            ])['options'];
            $correct = $request->validate([
                'correct_answer' => ['required', 'integer', 'min:0', 'max:3'],
            ])['correct_answer'];
            $updateData['options'] = $options;
            $updateData['correct_answer'] = $correct;
        } elseif ($type === 'true_false') {
            $correct = $request->validate([
                'correct_answer' => ['required', 'in:true,false'],
            ])['correct_answer'];
            $updateData['correct_answer'] = $correct;
        } elseif ($type === 'matching') {
            $pairs = $request->validate([
                'matching_pairs' => ['required', 'array'],
            ])['matching_pairs'];
            $updateData['meta'] = ['matching_pairs' => $pairs];
        }

        $question->update($updateData);

        return response()->json(['data' => $question]);
    }

    public function destroy(Request $request, QuestionBank $questionBank, Question $question)
    {
        $question->delete();

        return response()->json(['message' => 'Soal berhasil dihapus']);
    }

    public function exportExcel(Request $request, QuestionBank $questionBank)
    {
        return Excel::download(
            new QuestionsExport($questionBank->id),
            "question-bank-{$questionBank->id}.xlsx"
        );
    }

    public function templateExcel(Request $request)
    {
        // Sheet 1: Template dengan contoh dan petunjuk
        $headings = [
            // Header row
            ['type', 'prompt', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_choice', 'correct_true_false', 'matching_pairs_json', 'explanation', 'difficulty'],
            // Contoh Pilihan Ganda
            ['multiple_choice', 'Ibu kota Indonesia adalah…', 'Bandung', 'Jakarta', 'Surabaya', 'Medan', 'b', '', '', 'Jakarta adalah ibu kota negara Indonesia.', '1'],
            // Contoh True/False
            ['true_false', 'Laravel adalah framework PHP.', '', '', '', '', '', 'true', '', 'Laravel memang framework berbasis PHP.', ''],
            // Contoh Essay
            ['essay', 'Jelaskan apa itu Laravel dan fungsinya dalam pengembangan web!', '', '', '', '', '', '', '', 'Jawaban dapat berupa penjelasan tentang Laravel.', ''],
            // Contoh Pilihan Ganda Kompleks (multiple correct)
            ['multiple_choice_multiple', 'Pilih semua framework PHP!', 'Laravel', 'Django', 'CodeIgniter', 'React', 'a,c', '', '', 'Laravel dan CodeIgniter adalah framework PHP.', '2'],
            // Contoh Matching
            ['matching', 'Pasangkan teknologi dengan fungsinya!', 'PHP', 'Laravel', 'Vue.js', 'Python', 'd', '', '{"PHP":"Bahasa Pemrograman","Laravel":"Framework PHP","Vue.js":"Framework JavaScript","Python":"Bahasa Pemrograman"}', 'Pasangkan dengan benar.', '2'],
            // Kosong untuk diisi
            ['multiple_choice', '', '', '', '', '', '', '', '', '', '', ''],
        ];

        // Sheet 2: Petunjuk Lengkap
        $instructions = [
            ['PETUNJUK PENGISIAN TEMPLATE SOAL'],
            [''],
            ['KOLOM:'],
            ['type        = Jenis soal: multiple_choice, multiple_choice_multiple, true_false, essay, matching'],
            ['prompt      = Pertanyaan/soal (wajib diisi)'],
            ['option_a   = Opsi jawaban A (untuk multiple_choice, multiple_choice_multiple, matching)'],
            ['option_b   = Opsi jawaban B'],
            ['option_c   = Opsi jawaban C'],
            ['option_d   = Opsi jawaban D'],
            ['correct_choice = Jawaban benar untuk Pilihan Ganda (a/b/c/d) atau multiple (a,c atau a,b,c)'],
            ['correct_true_false = Jawaban untuk True/False (true/false)'],
            ['matching_pairs_json = JSON format untuk matching: {"kiri1":"kanan1","kiri2":"kanan2",...}'],
            ['explanation = Penjelasan jawaban (opsional)'],
            ['difficulty  = Tingkat kesulitan: 1=Mudah, 2=Sedang, 3=Sulit (opsional)'],
            [''],
            ['CONTOH PENGERjaan:'],
            ['1. multiple_choice: type="multiple_choice", prompt="2+2=?", option_a="3", option_b="4", option_c="5", option_d="6", correct_choice="b"'],
            ['2. multiple_choice_multiple: type="multiple_choice_multiple", prompt="Pilih framework PHP!", option_a="Laravel", option_b="Django", option_c="CodeIgniter", correct_choice="a,c"'],
            ['3. true_false: type="true_false", prompt="Laravel adalah framework PHP", correct_true_false="true"'],
            ['4. essay: type="essay", prompt="Jelaskan..." (tidak perlu opsi jawaban)'],
            ['5. matching: type="matching", prompt="Pasangkan...", option_a="PHP", option_b="Laravel", option_c="Vue.js", option_d="Python", matching_pairs_json=\'{"PHP":"Bahasa","Laravel":"Framework PHP","Vue.js":"Framework JS","Python":"Bahasa"}\''],
            [''],
            ['CATATAN:'],
            ['- Baris pertama adalah header, jangan dihapus'],
            ['- Baris ke-2-6 adalah contoh, bisa dihapus atau diedit'],
            ['- Baris ke-7 adalah template kosong, bisa diisi atau добавить baris baru'],
            ['- Untuk import, hanya данные setelah baris header yang akan diproses'],
        ];

        return Excel::download(new class($headings, $instructions) implements \Maatwebsite\Excel\Concerns\WithMultipleSheets {
            public function __construct(private array $headings, private array $instructions) {}
            public function sheets(): array
            {
                return [
                    new \App\Exports\TemplateSheet($this->headings),
                    new \App\Exports\InstructionsSheet($this->instructions),
                ];
            }
        }, 'questions-template.xlsx');
    }

    public function importExcel(Request $request, QuestionBank $questionBank)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv'],
        ]);

        $import = new QuestionsImport($questionBank->id);
        Excel::import($import, $data['file']);

        return response()->json([
            'ok' => true,
            'created' => $import->created,
            'skipped' => $import->skipped,
        ]);
    }

    public function addQuestions(Request $request, Exam $exam)
    {
        $data = $request->validate([
            'question_ids' => ['required', 'array'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
        ]);

        $maxOrder = $exam->examQuestions()->max('fixed_order') ?? 0;

        foreach ($data['question_ids'] as $questionId) {
            $exists = $exam->examQuestions()->where('question_id', $questionId)->exists();
            if (!$exists) {
                $maxOrder++;
                ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $questionId,
                    'fixed_order' => $maxOrder,
                ]);
            }
        }

        return response()->json(['ok' => true]);
    }

    public function removeQuestion(Exam $exam, ExamQuestion $examQuestion)
    {
        if ($examQuestion->exam_id !== $exam->id) {
            return response()->json(['message' => 'Soal tidak ditemukan'], 404);
        }

        $examQuestion->delete();

        return response()->json(['ok' => true]);
    }
}

