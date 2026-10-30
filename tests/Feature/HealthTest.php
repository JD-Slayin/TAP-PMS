<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_success(): void
    {
        $this->getJson('/api/v1/health')->assertOk()->assertJsonPath('status', 'success');
    }
}
