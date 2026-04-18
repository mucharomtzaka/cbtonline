<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = Setting::get('openai_api_key', '');
        $this->model = Setting::get('openai_model', 'gpt-4o-mini');
        $this->baseUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Generate questions from a topic using OpenAI
     */
    public function generateQuestions(string $topic, int $count = 5, string $type = 'multiple_choice'): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception('OpenAI API key is not configured');
        }

        $prompt = $this->buildPrompt($topic, $count, $type);
        
        try {
            $response = Http::timeout(60)->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl, [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a helpful assistant that generates quiz questions in JSON format.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.7,
                'max_tokens' => 4096,
            ]);

            if (!$response->successful()) {
                Log::error('OpenAI API error: ' . $response->body());
                throw new \Exception('Failed to generate questions: ' . $response->json('error.message', 'Unknown error'));
            }

            $text = $response->json('choices.0.message.content', '');
            return $this->parseQuestions($text, $type);
        } catch (\Exception $e) {
            Log::error('OpenAIService error: ' . $e->getMessage());
            throw $e;
        }
    }

    protected function buildPrompt(string $topic, int $count, string $type): string
    {
        $typeDescription = match($type) {
            'multiple_choice' => 'soal pilihan ganda dengan 4 opsi jawaban (A, B, C, D)',
            'true_false' => 'soal benar/salah',
            'essay' => 'soal esai/uraian',
            default => 'soal pilihan ganda dengan 4 opsi jawaban'
        };

        $format = match($type) {
            'multiple_choice' => <<<'JSON'
Jawaban dalam format JSON array:
[
  {
    "prompt": "Pertanyaan...",
    "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
    "correct_index": 0,
    "explanation": "Penjelasan jawaban yang benar"
  }
]
JSON
,
            'true_false' => <<<'JSON'
Jawaban dalam format JSON array:
[
  {
    "prompt": "Pernyataan...",
    "correct": true,
    "explanation": "Penjelasan mengapa benar/salah"
  }
]
JSON
,
            'essay' => <<<'JSON'
Jawaban dalam format JSON array:
[
  {
    "prompt": "Pertanyaan...",
    "sample_answer": "Contoh jawaban yang diharapkan"
  }
]
JSON
,
            default => ''
        };

        return <<<PROMPT
Buat $count $typeDescription tentang topic berikut:

$topic

$format

PENTING:
- JSON harus valid dan bisa di-parse
- Jangan tambahkan teks lain selain JSON
- prompt harus dalam Bahasa Indonesia
- Untuk multiple_choice, correct_index adalah index array opsi yang benar (0-3)
- Untuk true_false, correct adalah true untuk benar, false untuk salah
PROMPT;
    }

    protected function parseQuestions(string $text, string $type): array
    {
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $matches)) {
            $text = $matches[1];
        }

        $text = trim($text);
        $data = json_decode($text, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            if (preg_match('/\[[\s\S]*\]/', $text, $matches)) {
                $data = json_decode($matches[0], true);
            }
        }

        if (!is_array($data)) {
            throw new \Exception('Failed to parse generated questions');
        }

        $questions = [];
        foreach ($data as $item) {
            if ($type === 'multiple_choice') {
                $questions[] = [
                    'type' => 'multiple_choice',
                    'prompt' => $item['prompt'] ?? '',
                    'options' => $item['options'] ?? [],
                    'answer' => ['choice' => $item['correct_index'] ?? 0],
                    'correct_answer' => $item['options'][$item['correct_index'] ?? 0] ?? '',
                    'explanation' => $item['explanation'] ?? '',
                ];
            } elseif ($type === 'true_false') {
                $questions[] = [
                    'type' => 'true_false',
                    'prompt' => $item['prompt'] ?? '',
                    'options' => ['Salah', 'Benar'],
                    'answer' => ['value' => $item['correct'] ?? true],
                    'correct_answer' => ($item['correct'] ?? true) ? 'Benar' : 'Salah',
                    'explanation' => $item['explanation'] ?? '',
                ];
            } elseif ($type === 'essay') {
                $questions[] = [
                    'type' => 'essay',
                    'prompt' => $item['prompt'] ?? '',
                    'options' => [],
                    'answer' => ['text' => $item['sample_answer'] ?? ''],
                    'correct_answer' => $item['sample_answer'] ?? '',
                    'explanation' => $item['explanation'] ?? '',
                ];
            }
        }

        return $questions;
    }
}