<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PmsUploadController extends Controller
{
    private function proofDirectory(): string
    {
        $directory = public_path('tap-pms-ui/proofs');
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }
        return $directory;
    }

    public function attendanceProof(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'regex:/^[A-Za-z0-9_-]+\.jpg$/'],
            'data' => ['required', 'string', 'max:900000'],
        ]);
        $encoded = preg_replace('#^data:image/jpeg;base64,#', '', $data['data']);
        $binary = base64_decode($encoded, true);
        if ($binary === false || strlen($binary) > 600000 || substr($binary, 0, 3) !== "\xFF\xD8\xFF") {
            return response()->json(['ok' => false, 'error' => 'The uploaded image is not a valid JPEG.'], 422);
        }
        if (file_put_contents($this->proofDirectory().DIRECTORY_SEPARATOR.$data['name'], $binary) === false) {
            return response()->json(['ok' => false, 'error' => 'Could not save the attendance photo.'], 500);
        }
        return response()->json(['ok' => true, 'path' => 'proofs/'.$data['name']]);
    }

    public function leaveAttachment(Request $request): JsonResponse
    {
        return $this->saveAttachment($request, 'LEAVE_', '/^[A-Za-z0-9-]{4,40}$/', 'controlNo');
    }

    public function requestAttachment(Request $request): JsonResponse
    {
        return $this->saveAttachment($request, 'REQUEST_', '/^REQ-[A-Za-z0-9-]{6,60}$/', 'controlNo');
    }

    private function saveAttachment(Request $request, string $prefix, string $pattern, string $controlField): JsonResponse
    {
        $request->validate([
            $controlField => ['required', 'string', 'max:80'],
            'file' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,pdf'],
        ]);
        $control = (string) $request->input($controlField);
        if (!preg_match($pattern, $control)) {
            return response()->json(['ok' => false, 'error' => 'Invalid request number.'], 422);
        }
        $file = $request->file('file');
        $mime = $file->getMimeType();
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
            default => null,
        };
        if (!$extension) {
            return response()->json(['ok' => false, 'error' => 'Only JPG, PNG, or PDF files are allowed.'], 422);
        }
        $name = $prefix.$control.'.'.$extension;
        $file->move($this->proofDirectory(), $name);
        return response()->json(['ok' => true, 'path' => 'proofs/'.$name]);
    }
}
