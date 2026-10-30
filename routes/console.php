<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('tap-pms:status', function () {
    $this->info('TAP-PMS Laravel routes and application scaffold are loaded.');
})->purpose('Show TAP-PMS application status');
