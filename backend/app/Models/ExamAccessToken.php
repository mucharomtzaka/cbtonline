<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAccessToken extends Model
{
    protected $fillable = [
        'exam_id',
        'token',
        'is_active',
        'expires_at',
        'generated_by_user_id',
    ];

    protected $casts = [
        'is_active' => 'bool',
        'expires_at' => 'datetime',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}

