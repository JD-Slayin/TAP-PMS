<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PmsSyncController extends Controller
{
    private function statePath(): string
    {
        return storage_path('app/pms/live_data.json');
    }

    /**
     * Short id of THIS server's data file. The kiosk and the laptop badges show it:
     * if the two devices show different ids, they are talking to different servers.
     */
    private function serverId(): string
    {
        return substr(md5(gethostname() . '|' . $this->statePath()), 0, 4);
    }

    private function withLockedState(callable $callback): mixed
    {
        $path = $this->statePath();
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        $handle = fopen($path, 'c+');
        if (!$handle) {
            throw new \RuntimeException('The shared attendance data store is not writable.');
        }
        try {
            flock($handle, LOCK_EX);
            rewind($handle);
            $raw = stream_get_contents($handle);
            // Decode as objects (not arrays) so an empty {} stays {} when it is sent back to the browsers.
            $current = json_decode($raw ?: '');
            if (!is_object($current) || !property_exists($current, 'rev')) {
                $current = (object) ['rev' => 0, 'state' => null];
            }
            return $callback($current, $handle);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    public function show(): JsonResponse
    {
        return $this->withLockedState(function (object $current): JsonResponse {
            return response()
                ->json(['rev' => (int) $current->rev, 'state' => $current->state ?? null, 'sid' => $this->serverId()])
                ->header('Cache-Control', 'no-store');
        });
    }

    public function update(Request $request): JsonResponse
    {
        // Read the raw JSON body instead of $request->validate(): Laravel's default middleware turns "" into null,
        // and decoding to PHP arrays turns {} into [] -- both changed the attendance data on its way through.
        $body = json_decode($request->getContent());
        if (
            !is_object($body)
            || !isset($body->baseRev) || !is_int($body->baseRev) || $body->baseRev < 0
            || !isset($body->state) || !is_object($body->state)
        ) {
            return response()->json(['ok' => false, 'error' => 'Invalid sync payload'], 422);
        }

        return $this->withLockedState(function (object $current, $handle) use ($body): JsonResponse {
            if ($body->baseRev !== (int) $current->rev) {
                return response()->json([
                    'ok' => false,
                    'rev' => (int) $current->rev,
                    'state' => $current->state ?? null,
                    'sid' => $this->serverId(),
                ])->header('Cache-Control', 'no-store');
            }

            $next = ['rev' => (int) $current->rev + 1, 'state' => $body->state];
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($next, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            fflush($handle);

            return response()
                ->json(['ok' => true, 'rev' => $next['rev'], 'sid' => $this->serverId()])
                ->header('Cache-Control', 'no-store');
        });
    }
}
