<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $employee = Employee::firstOrCreate(['employee_no' => 'EMP-001'], [
            'full_name' => 'Eunice Cartolina', 'department' => 'Operations', 'position' => 'Staff',
            'monthly_rate' => 18000, 'status' => 'Active', 'rfid_uid' => 'DEMO-EMP-001',
        ]);
        WorkSchedule::firstOrCreate(['employee_id' => $employee->id, 'effective_from' => '2026-01-01'], [
            'work_start' => '08:00:00', 'lunch_start' => '12:00:00', 'lunch_end' => '13:00:00', 'work_end' => '17:00:00',
            'early_clock_in_minutes' => 30, 'lunch_window_before_minutes' => 5, 'lunch_window_after_minutes' => 30,
        ]);
    }
}
