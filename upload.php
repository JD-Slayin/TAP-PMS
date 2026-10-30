<?php
// Saves a JPEG attendance proof into /proofs. Body: {"name":"2026-10-17_EMP-001_IN_080102.jpg","data":"data:image/jpeg;base64,..."}
header('Content-Type: application/json');
header('Cache-Control: no-store');
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in) || empty($in['name']) || empty($in['data'])) { echo json_encode(['ok' => false, 'error' => 'bad body']); exit; }
$name = basename($in['name']);
if (!preg_match('/^[A-Za-z0-9_\-]+\.jpg$/', $name)) { echo json_encode(['ok' => false, 'error' => 'bad filename']); exit; }
$b64 = preg_replace('#^data:image/jpeg;base64,#', '', $in['data']);
$bin = base64_decode($b64, true);
if ($bin === false || strlen($bin) > 600000 || substr($bin, 0, 3) !== "\xFF\xD8\xFF") { echo json_encode(['ok' => false, 'error' => 'not a valid jpeg']); exit; }
$dir = __DIR__ . '/proofs';
if (!is_dir($dir) && !mkdir($dir, 0775, true)) { echo json_encode(['ok' => false, 'error' => 'cannot create proofs folder']); exit; }
if (file_put_contents($dir . '/' . $name, $bin) === false) { echo json_encode(['ok' => false, 'error' => 'cannot write file']); exit; }
echo json_encode(['ok' => true, 'path' => 'proofs/' . $name]);
