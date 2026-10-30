<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/tap-pms-ui/index.html'));
Route::get('/kiosk', fn () => redirect('/tap-pms-ui/kiosk.html'));
Route::view('/health-check', 'health-check');
