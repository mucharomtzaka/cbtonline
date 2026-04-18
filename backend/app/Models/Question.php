<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    protected $fillable = [
        'question_bank_id',
        'type',
        'prompt',
        'media_type',
        'media_url',
        'media_caption',
        'options',
        'correct_answer',
        'explanation',
        'difficulty',
        'meta',
    ];

    protected $casts = [
        'options' => 'array',
        'correct_answer' => 'array',
        'meta' => 'array',
    ];

    public function bank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class, 'question_bank_id');
    }
}

