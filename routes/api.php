<?php

use App\Http\Controllers\PmsSyncController;
use App\Http\Controllers\PmsUploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', fn () => response()->json(['status' => 'success', 'app' => 'TAP-PMS Laravel API']));
    Route::get('/sync', [PmsSyncController::class, 'show']);
    Route::post('/sync', [PmsSyncController::class, 'update']);
    Route::post('/uploads/attendance-proof', [PmsUploadController::class, 'attendanceProof']);
    Route::post('/uploads/leave', [PmsUploadController::class, 'leaveAttachment']);
    Route::post('/uploads/request', [PmsUploadController::class, 'requestAttachment']);
});
