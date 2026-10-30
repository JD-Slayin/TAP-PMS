<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    protected $fillable = ['employee_id','effective_from','effective_to','work_start','lunch_start','lunch_end','work_end','early_clock_in_minutes','lunch_window_before_minutes','lunch_window_after_minutes'];
    public function employee() { return $this->belongsTo(Employee::class); }
}
