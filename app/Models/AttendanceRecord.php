<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    protected $fillable = ['employee_id','work_date','am_in','am_out','pm_in','pm_out','status','source','metadata'];
    protected function casts(): array { return ['work_date' => 'date', 'am_in' => 'datetime', 'am_out' => 'datetime', 'pm_in' => 'datetime', 'pm_out' => 'datetime', 'metadata' => 'array']; }
    public function employee() { return $this->belongsTo(Employee::class); }
}
