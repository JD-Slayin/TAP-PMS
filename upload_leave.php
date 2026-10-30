<?php
// Saves a leave attachment (jpg, png or pdf, max 5 MB) into /proofs. Multipart POST: file=<file>, controlNo=REQ-2026-0001
header('Content-Type: application/json');
header('Cache-Control: no-store');
$ctrl = $_POST['controlNo'] ?? '';
if (!preg_match('/^[A-Za-z0-9\-]{4,40}$/', $ctrl) || empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) { echo json_encode(['ok' => false, 'error' => 'no file received']); exit; }
$f = $_FILES['file'];
if ($f['size'] > 5 * 1024 * 1024) { echo json_encode(['ok' => false, 'error' => 'file is over 5 MB']); exit; }
$head = file_get_contents($f['tmp_name'], false, null, 0, 8);
if (strncmp($head, "\xFF\xD8\xFF", 3) === 0) $ext = 'jpg';
elseif (strncmp($head, "\x89PNG", 4) === 0) $ext = 'png';
elseif (strncmp($head, '%PDF', 4) === 0) $ext = 'pdf';
else { echo json_encode(['ok' => false, 'error' => 'only JPG, PNG or PDF']); exit; }
$dir = __DIR__ . '/proofs';
if (!is_dir($dir) && !mkdir($dir, 0775, true)) { echo json_encode(['ok' => false, 'error' => 'cannot create proofs folder']); exit; }
$name = 'LEAVE_' . $ctrl . '.' . $ext;
if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) { echo json_encode(['ok' => false, 'error' => 'cannot write file']); exit; }
echo json_encode(['ok' => true, 'path' => 'proofs/' . $name]);
