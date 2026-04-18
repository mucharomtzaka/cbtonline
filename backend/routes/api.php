<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExamAnalyticsController;
use App\Http\Controllers\ExamAttemptController;
use App\Http\Controllers\ExamController;
use App\Http\Controllers\ExamGradingController;
use App\Http\Controllers\ExamParticipantController;
use App\Http\Controllers\ExamReportController;
use App\Http\Controllers\ExamTokenController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\QuestionBankController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    // Users (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/search', [UserController::class, 'search']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

    Route::middleware('role:admin|guru')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/question-banks', [QuestionBankController::class, 'index']);
        Route::post('/question-banks', [QuestionBankController::class, 'store']);
        Route::get('/question-banks/{questionBank}', [QuestionBankController::class, 'show']);
        Route::put('/question-banks/{questionBank}', [QuestionBankController::class, 'update']);
        Route::delete('/question-banks/{questionBank}', [QuestionBankController::class, 'destroy']);
        Route::get('/question-banks/{questionBank}/questions', [QuestionController::class, 'index']);
        Route::post('/question-banks/{questionBank}/questions', [QuestionController::class, 'store']);
        Route::put('/question-banks/{questionBank}/questions/{question}', [QuestionController::class, 'update']);
        Route::delete('/question-banks/{questionBank}/questions/{question}', [QuestionController::class, 'destroy']);
        Route::get('/question-banks/{questionBank}/questions/export.xlsx', [QuestionController::class, 'exportExcel']);
        Route::get('/question-banks/questions/template.xlsx', [QuestionController::class, 'templateExcel']);
        Route::post('/question-banks/{questionBank}/questions/import', [QuestionController::class, 'importExcel']);
        Route::post('/question-banks/{questionBank}/generate', [QuestionBankController::class, 'generate']);

        // Exam management (guru/admin only)
        Route::post('/exams', [ExamController::class, 'store']);
        Route::get('/exams/{exam}', [ExamController::class, 'show']);
        Route::put('/exams/{exam}', [ExamController::class, 'update']);
        Route::delete('/exams/{exam}', [ExamController::class, 'destroy']);
        Route::get('/exams/{exam}/questions', [QuestionController::class, 'examQuestions']);
        Route::post('/exams/{exam}/questions', [QuestionController::class, 'addQuestions']);
        Route::delete('/exams/{exam}/questions/{examQuestion}', [QuestionController::class, 'removeQuestion']);
    });

    // Exams read - accessible by all authenticated users including peserta
    Route::middleware('role:admin|guru|peserta')->group(function () {
        Route::get('/exams', [ExamController::class, 'index']);
        Route::get('/exams/{exam}', [ExamController::class, 'show']);
    });

    // Groups - accessible by admin/guru only
    Route::middleware('role:admin|guru')->group(function () {
        Route::get('/groups', [GroupController::class, 'index']);
        Route::post('/groups', [GroupController::class, 'store']);
        Route::get('/groups/{group}', [GroupController::class, 'show']);
        Route::put('/groups/{group}', [GroupController::class, 'update']);
        Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
        Route::get('/groups/{group}/members', [GroupController::class, 'members']);
        Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
        Route::post('/groups/{group}/members/bulk', [GroupController::class, 'addMembersBulk']);
        Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'removeMember']);

        Route::get('/exams/{exam}/participants', [ExamParticipantController::class, 'index']);
        Route::post('/exams/{exam}/participants/register', [ExamParticipantController::class, 'registerUser']);
        Route::post('/exams/{exam}/participants/import-group', [ExamParticipantController::class, 'importFromGroup']);
        Route::delete('/exams/{exam}/participants/{registration}', [ExamParticipantController::class, 'unregisterUser']);
        Route::get('/exams/{exam}/attendance', [ExamParticipantController::class, 'attendanceList']);
        Route::post('/exams/{exam}/attendance/mark', [ExamParticipantController::class, 'markPresent']);

        Route::get('/grading/pending-essays', [ExamGradingController::class, 'pendingEssays']);
        Route::get('/grading/attempts/{examAttempt}', [ExamGradingController::class, 'showAttempt']);
        Route::post('/grading/attempts/{examAttempt}', [ExamGradingController::class, 'gradeAttempt']);
    });

    Route::middleware('role:admin|operator')->group(function () {
        Route::get('/exams/{exam}/tokens', [ExamTokenController::class, 'index']);
        Route::post('/exams/{exam}/token', [ExamTokenController::class, 'store']);
        Route::delete('/exams/{exam}/tokens/{token}', [ExamTokenController::class, 'destroy']);
    });

    Route::middleware('role:peserta')->group(function () {
        Route::post('/exams/{exam}/start', [ExamAttemptController::class, 'start']);
        Route::post('/exams/{exam}/reset', [ExamAttemptController::class, 'reset']);
        Route::get('/exams/{exam}/status', [ExamAttemptController::class, 'status']);
        Route::get('/exams/{exam}/my-result', [ExamAttemptController::class, 'myResult']);
        Route::get('/attempts/{examAttempt}', [ExamAttemptController::class, 'show']);
        Route::put('/attempts/{examAttempt}/answer', [ExamAttemptController::class, 'saveAnswer']);
        Route::post('/attempts/{examAttempt}/submit', [ExamAttemptController::class, 'submit']);
        Route::post('/attempts/{examAttempt}/events', [ExamAttemptController::class, 'logEvent']);
    });

    Route::middleware('role:admin|guru|viewer')->group(function () {
        Route::post('/exams/{exam}/reset-all', [ExamAttemptController::class, 'resetAll']);
        Route::get('/exams/{exam}/analytics/summary', [ExamAnalyticsController::class, 'summary']);
        Route::get('/exams/{exam}/analytics/item-analysis', [ExamAnalyticsController::class, 'itemAnalysis']);

        Route::get('/exams/{exam}/reports/results', [ExamReportController::class, 'results']);
        Route::get('/exams/{exam}/reports/ranking', [ExamReportController::class, 'ranking']);

        // Settings (admin only - update)
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings/logo', [SettingController::class, 'uploadLogo']);
    });
});

// Export routes - allow token auth via query param (outside auth middleware)
Route::get('/exams/{exam}/reports/export.xlsx', [ExamReportController::class, 'exportExcel']);
Route::get('/exams/{exam}/reports/export.pdf', [ExamReportController::class, 'exportPdf']);

// Public settings (for login page)
Route::get('/settings', [SettingController::class, 'index']);

