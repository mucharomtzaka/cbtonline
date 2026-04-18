<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
        'owner_user_id',
        'question_bank_id',
        'duration_seconds',
        'attempt_limit',
        'allow_retake',
        'randomize_questions',
        'randomize_options',
        'auto_submit_on_timeout',
        'show_result_after_submit',
        'show_result_after_end',
        'scoring_type',
        'negative_mark',
        'question_weight',
    ];

    protected $casts = [
        'randomize_questions' => 'bool',
        'randomize_options' => 'bool',
        'auto_submit_on_timeout' => 'bool',
        'show_result_after_submit' => 'bool',
        'show_result_after_end' => 'bool',
        'negative_mark' => 'float',
        'question_weight' => 'float',
        'allow_retake' => 'bool',
    ];

    protected $attributes = [
        'randomize_questions' => false,
        'randomize_options' => false,
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ExamSchedule::class);
    }

    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(ExamAccessToken::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(ExamRegistration::class);
    }
}

