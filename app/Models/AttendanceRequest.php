<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceRequest extends Model
{
    protected $fillable = ['employee_id','work_date','requested_punches','reason','attachment_path','status','reviewed_by','reviewed_at'];
    protected function casts(): array { return ['work_date' => 'date', 'requested_punches' => 'array', 'reviewed_at' => 'datetime']; }
    public function employee() { return $this->belongsTo(Employee::class); }
}
