<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = ['employee_no','full_name','department','position','monthly_rate','status','rfid_uid'];
    public function schedules() { return $this->hasMany(WorkSchedule::class); }
    public function attendanceRecords() { return $this->hasMany(AttendanceRecord::class); }
    public function attendanceRequests() { return $this->hasMany(AttendanceRequest::class); }
}
