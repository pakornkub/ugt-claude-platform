<?php

use App\Http\Controllers\RequestController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('welcome'));
Route::get('/requests', [RequestController::class, 'index']);
Route::post('/requests/{id}/attachment', [RequestController::class, 'attach']);
