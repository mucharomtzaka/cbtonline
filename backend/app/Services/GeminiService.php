<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl;

    // Valid models for free tier
    const FREE_TIER_MODELS = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-exp',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
    ];

    public function __construct()
    {
        // Get API key from database settings, fallback to env
        $this->apiKey = Setting::get('gemini_api_key', config('services.gemini.key', env('GEMINI_API_KEY', '')));
        
        // Validate model - fallback to default if invalid
        $configuredModel = Setting::get('gemini_model', config('services.gemini.model', env('GEMINI_MODEL', 'gemini-2.0-flash')));
        $this->model = in_array($configuredModel, self::FREE_TIER_MODELS) ? $configuredModel : 'gemini-2.0-flash';
        
        // Use v1 API (more compatible) instead of v1beta
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1/models/' . $this->model . ':generateContent';
    }

    /**
     * Generate questions from a topic using Gemini AI
     *
     * @param string $topic The topic/description for generating questions
     * @param int $count Number of questions to generate
     * @param string $type Question type (multiple_choice, true_false, essay)
     * @return array Generated questions
     */
    public function generateQuestions(string $topic, int $count = 5, string $type = 'multiple_choice'): array
    {
        if (empty($this->apiKey)) {
            throw new \Exception('GEMINI_API_KEY is not configured');
        }

        $prompt = $this->buildPrompt($topic, $count, $type);
        
        try {
            $response = Http::timeout(60)->post($this->baseUrl . '?key=' . $this->apiKey, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 8192,
                    'topP' => 0.95,
                    'topK' => 40
                ]
            ]);

            if (!$response->successful()) {
                Log::error('Gemini API error: ' . $response->body());
                throw new \Exception('Failed to generate questions: ' . $response->json('error.message', 'Unknown error'));
            }

            $text = $response->json('candidates.0.content.parts.0.text', '');
            return $this->parseQuestions($text, $type);
        } catch (\Exception $e) {
            Log::error('GeminiService error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Build the prompt for question generation
     */
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

    /**
     * Parse the AI response to extract questions
     */
    protected function parseQuestions(string $text, string $type): array
    {
        // Extract JSON from markdown code block if present
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $matches)) {
            $text = $matches[1];
        }

        // Clean up the text
        $text = trim($text);
        
        // Try to parse as JSON
        $data = json_decode($text, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Try to find JSON array in the text
            if (preg_match('/\[[\s\S]*\]/', $text, $matches)) {
                $data = json_decode($matches[0], true);
            }
        }

        if (!is_array($data)) {
            throw new \Exception('Failed to parse generated questions');
        }

        // Transform to database format
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