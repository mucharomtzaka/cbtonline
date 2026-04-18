<?php

namespace App\Services;

use App\Models\Setting;

class AIService
{
    protected string $provider;

    public function __construct()
    {
        $this->provider = Setting::get('ai_provider', 'gemini');
    }

    /**
     * Generate questions using the configured AI provider
     */
    public function generateQuestions(string $topic, int $count = 5, string $type = 'multiple_choice'): array
    {
        $service = match($this->provider) {
            'openai' => new OpenAIService(),
            'anthropic' => new AnthropicService(),
            default => new GeminiService(),
        };

        return $service->generateQuestions($topic, $count, $type);
    }

    /**
     * Get available providers
     */
    public static function getProviders(): array
    {
        return [
            'gemini' => 'Google Gemini',
            'openai' => 'OpenAI',
            'anthropic' => 'Anthropic Claude',
        ];
    }
}