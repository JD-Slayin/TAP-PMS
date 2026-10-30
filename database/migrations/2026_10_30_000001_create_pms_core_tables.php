<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('employees', function (Blueprint $table) {
            $table->id(); $table->string('employee_no')->unique(); $table->string('full_name'); $table->string('department')->nullable(); $table->string('position')->nullable();
            $table->decimal('monthly_rate', 12, 2)->default(0); $table->string('status')->default('Active'); $table->string('rfid_uid')->nullable()->unique(); $table->timestamps();
        });
        Schema::create('work_schedules', function (Blueprint $table) {
            $table->id(); $table->foreignId('employee_id')->constrained()->cascadeOnDelete(); $table->date('effective_from'); $table->date('effective_to')->nullable();
            $table->time('work_start'); $table->time('lunch_start')->nullable(); $table->time('lunch_end')->nullable(); $table->time('work_end');
            $table->unsignedSmallInteger('early_clock_in_minutes')->default(30); $table->unsignedSmallInteger('lunch_window_before_minutes')->default(5); $table->unsignedSmallInteger('lunch_window_after_minutes')->default(30); $table->timestamps();
            $table->index(['employee_id','effective_from','effective_to']);
        });
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id(); $table->foreignId('employee_id')->constrained()->cascadeOnDelete(); $table->date('work_date');
            $table->dateTime('am_in')->nullable(); $table->dateTime('am_out')->nullable(); $table->dateTime('pm_in')->nullable(); $table->dateTime('pm_out')->nullable();
            $table->string('status')->default('Incomplete'); $table->string('source')->default('RFID'); $table->json('metadata')->nullable(); $table->timestamps();
            $table->unique(['employee_id','work_date']);
        });
        Schema::create('attendance_requests', function (Blueprint $table) {
            $table->id(); $table->foreignId('employee_id')->constrained()->cascadeOnDelete(); $table->date('work_date'); $table->json('requested_punches');
            $table->text('reason'); $table->string('attachment_path')->nullable(); $table->string('status')->default('Pending'); $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamp('reviewed_at')->nullable(); $table->timestamps();
        });
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id(); $table->date('period_start'); $table->date('period_end'); $table->string('status')->default('Draft'); $table->json('snapshot')->nullable(); $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamp('released_at')->nullable(); $table->timestamps();
            $table->unique(['period_start','period_end']);
        });
    }
    public function down(): void { Schema::dropIfExists('payroll_runs'); Schema::dropIfExists('attendance_requests'); Schema::dropIfExists('attendance_records'); Schema::dropIfExists('work_schedules'); Schema::dropIfExists('employees'); }
};
