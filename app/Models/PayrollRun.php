<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollRun extends Model
{
    protected $fillable = ['period_start','period_end','status','snapshot','released_by','released_at'];
    protected function casts(): array { return ['period_start' => 'date', 'period_end' => 'date', 'snapshot' => 'array', 'released_at' => 'datetime']; }
}
