<?php
// Shared data store for laptop + phone. Keeps {rev, state} in live_data.json.
// A POST only wins if baseRev == current rev; otherwise the client gets the latest state back to merge.
header('Content-Type: application/json');
header('Cache-Control: no-store');
$f = __DIR__ . '/live_data.json';
$fp = fopen($f, 'c+');
if (!$fp) { echo json_encode(['ok' => false, 'error' => 'live_data.json not writable']); exit; }
flock($fp, LOCK_EX);
$cur = json_decode(stream_get_contents($fp), true);
if (!is_array($cur) || !isset($cur['rev'])) $cur = ['rev' => 0, 'state' => null];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $in = json_decode(file_get_contents('php://input'), true);
  if (!is_array($in) || !isset($in['state'])) { echo json_encode(['ok' => false, 'error' => 'bad body']); }
  elseif ((int)($in['baseRev'] ?? -1) === (int)$cur['rev']) {
    $cur = ['rev' => $cur['rev'] + 1, 'state' => $in['state']];
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($cur)); fflush($fp);
    echo json_encode(['ok' => true, 'rev' => $cur['rev']]);
  } else { echo json_encode(['ok' => false, 'rev' => $cur['rev'], 'state' => $cur['state']]); }
} else { echo json_encode($cur); }
flock($fp, LOCK_UN); fclose($fp);
