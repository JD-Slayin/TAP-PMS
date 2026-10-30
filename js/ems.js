// MOCK EMS (Employee Management System of the other group). Replace these functions with calls to their API on integration day.
// Expected from EMS: GET /employees (id, name, position, status, baseSalary), GET /appraisals (empId, oldSalary, newSalary, effectiveDate).
// PMS only READS these; it never edits salary, position or status.
const EMS = {
  isActive(emp) { return emp && emp.status === "Active"; },
  canLogin(emp) { return emp && !["Terminated", "Resigned", "Retired"].includes(emp.status); },
  // salary that applies on a given date (an appraisal only counts from its effective date)
  salaryOn(emp, dateStr) {
    const later = PMSStore.getAppraisals().filter(a => a.empId === emp.id && a.effectiveDate > dateStr).sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0];
    return later ? later.oldSalary : emp.baseSalary;
  },
  // position table: salary range + fixed rate (EMS owns this; HR picks the fixed rate or an approved rate inside the range)
  positions: {
    "Software Engineer": { min: 30000, max: 45000, fixed: 35000 },
    "UI/UX Designer": { min: 35000, max: 50000, fixed: 42000 },
    "Senior Consultant": { min: 50000, max: 70000, fixed: 55000 },
    "Former QA": { min: 25000, max: 35000, fixed: 28000 }
  },
  positionInfo(emp) {
    const p = this.positions[emp.role]; if (!p) return null;
    return Object.assign({ title: emp.role }, p, { within: emp.baseSalary >= p.min && emp.baseSalary <= p.max, isFixed: emp.baseSalary === p.fixed });
  },
  // past details of an employee (mock). Real EMS: GET /employees/:id/history
  historySeed: [
    { empId: "EMP-001", date: "2026-03-01", field: "Position", from: "Junior Software Engineer", to: "Software Engineer", by: "HR" },
    { empId: "EMP-001", date: "2026-03-01", field: "Base Salary", from: 28000, to: 35000, by: "HR" },
    { empId: "EMP-002", date: "2026-01-10", field: "Position", from: "Junior UI/UX Designer", to: "UI/UX Designer", by: "HR" },
    { empId: "EMP-003", date: "2026-09-30", field: "Status", from: "Active", to: "Retired", by: "HR" },
    { empId: "EMP-004", date: "2026-08-31", field: "Status", from: "Active", to: "Terminated", by: "HR" }
  ],
  getHistory(empId) {
    const ap = PMSStore.getAppraisals().filter(a => a.empId === empId).map(a => ({ empId, date: a.effectiveDate, field: "Base Salary", from: a.oldSalary, to: a.newSalary, by: "Appraisal: " + a.remarks }));
    return this.historySeed.filter(h => h.empId === empId).concat(ap).sort((a, b) => b.date.localeCompare(a.date));
  }
};
