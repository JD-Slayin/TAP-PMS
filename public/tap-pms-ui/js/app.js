// tap-pms-ui/js/app.js

$(function () {
  let currentUser = PMSStore.getAuthUser();

  function applyAuthSession() {
    const loginScreen = document.getElementById("loginScreen");
    const workspace = document.getElementById("appWorkspace");
    const adminNav = document.getElementById("adminNavGroup");
    const empNav = document.getElementById("empNavGroup");
    const roleLabel = document.getElementById("sidebarRoleLabel");
    const userName = document.getElementById("userDisplayName");
    const userRole = document.getElementById("userRoleBadge");

    if (!currentUser) {
      loginScreen.classList.remove("d-none");
      workspace.classList.add("d-none");
      return;
    }

    loginScreen.classList.add("d-none");
    workspace.classList.remove("d-none");

    if (currentUser.role === "admin") {
      adminNav.classList.remove("d-none");
      empNav.classList.add("d-none");
      roleLabel.innerText = "ADMINISTRATOR";
      userName.innerText = "System Administrator";
      userRole.innerText = "ADMIN";
      document.getElementById("crumbRole").innerText = "Administrator Console";
      userRole.className = "badge badge-soft-primary";
      switchView("admin-dashboard");
    } else {
      adminNav.classList.add("d-none");
      empNav.classList.remove("d-none");
      roleLabel.innerText = "EMPLOYEE";
      userName.innerText = currentUser.name;
      userRole.innerText = currentUser.empId;
      userRole.className = "badge badge-soft-success";
      document.getElementById("crumbRole").innerText = "Employee Self-Service";
      switchView("emp-dtr");
      PMSStore.pullFromServer(() => { renderEmpDtr(); renderEmpPayslips(); renderEmpRequests(); renderEmpLeaveRequests(); });
    }
  }

  $("#formLogin").on("submit", (e) => {
    e.preventDefault();
    const u = $("#loginUsername").val().trim();
    const p = $("#loginPassword").val().trim();

    if (u === "admin" && p === "admin123") {
      currentUser = { role: "admin", name: "System Administrator" };
      PMSStore.setAuthUser(currentUser);
      applyAuthSession();
      return;
    }

    const employees = PMSStore.getEmployees();
    const emp = employees.find(e => (e.id.toLowerCase() === u.toLowerCase() || e.username.toLowerCase() === u.toLowerCase()) && e.password === p);

    if (emp) {
      if (!EMS.canLogin(emp)) {
        alert("ACCESS DENIED: This account is no longer active (Terminated, Resigned or Retired).");
        return;
      }
      currentUser = { role: "employee", empId: emp.id, name: emp.name };
      PMSStore.setAuthUser(currentUser);
      applyAuthSession();
      return;
    }

    alert("Incorrect username or password.");
  });

  $("#btnLogout").on("click", () => {
    PMSStore.clearAuthUser();
    currentUser = null;
    applyAuthSession();
  });

  function switchView(viewName) {
    document.querySelectorAll(".app-sec").forEach(el => el.classList.add("d-none"));
    document.querySelectorAll(".ribbon .nav-link").forEach(el => el.classList.remove("active"));

    const sec = document.getElementById(`sec-${viewName}`);
    if (sec) sec.classList.remove("d-none");

    const link = document.querySelector(`[data-view="${viewName}"]`);
    if (link) link.classList.add("active");

    const titles = {
      "admin-dashboard": "Overview: Attendance and Payroll",
      "admin-workforce": "Employee Directory",
      "admin-payroll": "Payroll Processing and Master Report",
      "admin-appraisals": "Salary Appraisals and Leave Records",
      "emp-dtr": "My Attendance Record",
      "emp-leave": "File a Leave Request",
      "emp-payslips": "My Payslips",
      "emp-profile": "My Profile",
      "admin-approvals": "Approvals: Overtime, Schedule and Manual Attendance",
      "emp-requests": "Overtime, Schedule Change and Manual Attendance Requests"
    };
    document.getElementById("navViewTitle").innerText = titles[viewName] || "Dashboard";

    if (viewName === "admin-dashboard") renderAdminDashboard();
    if (viewName === "admin-workforce") renderAdminWorkforce();
    if (viewName === "admin-payroll") renderAdminPayroll();
    if (viewName === "admin-appraisals") renderAdminAppraisals();
    if (viewName === "emp-dtr") renderEmpDtr();
    if (viewName === "emp-payslips") renderEmpPayslips();
    if (viewName === "emp-leave") renderEmpLeaveRequests();
    if (viewName === "emp-profile") renderEmpProfile();
    if (viewName === "admin-approvals") renderApprovals();
    if (viewName === "emp-requests") renderEmpRequests();
  }

  $("[data-view]").on("click", function (e) {
    e.preventDefault();
    switchView($(this).attr("data-view"));
  });

  function dtrFiltered() {
    const search = (document.getElementById('dtrSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('dtrStatus')?.value || '';
    const start = document.getElementById('dtrFrom')?.value || '';
    const end = document.getElementById('dtrTo')?.value || '';
    return PMSStore.getDTR().filter(r => (!start || r.date >= start) && (!end || r.date <= end) && attendanceStatusMatches(r, status) && (!search || String(r.empId || '').toLowerCase().includes(search) || String(r.name || '').toLowerCase().includes(search)));
  }
  function requestsFiltered() {
    const search = (document.getElementById('apprSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('apprStatus')?.value || '';
    const start = document.getElementById('apprFrom')?.value || '';
    const end = document.getElementById('apprTo')?.value || '';
    return PMSStore.getRequests().filter(r => (!start || r.date >= start) && (!end || r.date <= end) && (!status || r.status === status) && (!search || [r.controlNo,r.empId,r.name,r.kind].some(v => String(v || '').toLowerCase().includes(search))));
  }
  // Attendance sessions are summed independently; lunch is excluded because it is the gap between AM and PM.
  const isBlank = v => !v || v === '--';
  const isTwoSession = r => r.v === 2 || r.timeIn2 !== undefined || r.timeOut2 !== undefined;
  const punchCells = r => { const f = v => isBlank(v) ? '--' : v; return isTwoSession(r) ? [f(r.timeIn), f(r.timeOut), f(r.timeIn2), f(r.timeOut2)] : [f(r.timeIn), '--', '--', f(r.timeOut)]; };
  const statusClass = s => /Late/.test(s) ? 'bg-danger' : /Incomplete|Verification/.test(s) ? 'bg-warning text-dark' : /Lunch|progress|Pending/.test(s) ? 'bg-secondary' : 'bg-success';
  const hmMinutes = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  function scheduleFor(emp, date) {
    const history = Array.isArray(emp.scheduleHistory) ? emp.scheduleHistory : [];
    const candidates = history.filter(x => !x.effectiveDate || x.effectiveDate <= date).sort((a,b) => String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || '')));
    const h = candidates[0] || {};
    return {
      scheduleStart: h.scheduleStart || emp.scheduleStart || '08:00',
      scheduleEnd: h.scheduleEnd || emp.scheduleEnd || '17:00',
      lunchStart: h.lunchStart || emp.lunchStart || '12:00',
      lunchEnd: h.lunchEnd || emp.lunchEnd || '13:00',
      graceMinutes: Number(h.graceMinutes ?? emp.graceMinutes ?? 15),
      shiftName: h.shiftName || emp.shiftName || 'Regular Shift'
    };
  }
  function attendanceMetrics(r) {
    const parse = v => { const m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if (!m) return null; const h=Number(m[1]), min=Number(m[2]); if(h<1||h>12||min>59)return null; return (h%12+(m[3].toUpperCase()==='PM'?12:0))*60+min; };
    const s1=parse(r.timeIn), e1=parse(r.timeOut), s2=parse(r.timeIn2), e2=parse(r.timeOut2);
    const emp=PMSStore.getEmployees().find(e=>e.id===r.empId)||{};
    const sh=scheduleFor(emp,r.date||localToday());
    const scheduledStart=hmMinutes(sh.scheduleStart) ?? 480, scheduledEnd=hmMinutes(sh.scheduleEnd) ?? 1020;
    const pmStart=hmMinutes(sh.lunchEnd) ?? 780, grace=Math.max(0,Number(sh.graceMinutes||0));
    const amLate=s1===null?0:Math.max(0,s1-scheduledStart-grace);
    const pmLate=s2===null?0:Math.max(0,s2-pmStart-grace);
    const late=amLate+pmLate;
    const span=(a,b)=>a===null||b===null?0:(b<a?b+1440:b)-a;
    let minutes;
    if (isTwoSession(r)) minutes=span(s1,e1)+span(s2,e2);
    else minutes=(s1!==null&&e1!==null)?span(s1,e1):0;
    // For legacy single-pair records, deduct only the configured lunch overlap.
    if (!isTwoSession(r) && s1!==null && e1!==null) {
      const finish=e1<s1?e1+1440:e1, ls=hmMinutes(sh.lunchStart)??720, le=hmMinutes(sh.lunchEnd)??780;
      minutes=Math.max(0,finish-s1-Math.max(0,Math.min(finish,le)-Math.max(s1,ls)));
    }
    const hours=Math.round(minutes/60*100)/100;
    const scheduledMinutes=Math.max(0,scheduledEnd-scheduledStart-((hmMinutes(sh.lunchEnd)??780)-(hmMinutes(sh.lunchStart)??720)));
    const undertime=Math.max(0,scheduledMinutes-minutes-late);
    const missing = isTwoSession(r) ? (s1===null || e1===null || s2===null || e2===null) : (s1===null || e1===null);
    const complete = !missing;
    let status;
    if (complete) {
      const earlyOut=(e2!==null && e2<scheduledEnd) || (s2===null && e1!==null && e1<scheduledEnd);
      status = /Manual/i.test(r.status||'') ? r.status : earlyOut ? 'Early Out' : late ? 'Late' : 'Completed';
    } else if (r.date < localToday()) status='Incomplete';
    else if (e1!==null && s2===null) status='Lunch Break';
    else if ((s1!==null&&!e1)||(s2!==null&&!e2)) status=late?'Late · In progress':'In progress';
    else status='Incomplete';
    return {late, undertime, hours, minutes, scheduledMinutes, status, complete};
  }
  const hoursLabel = n => Number(n || 0).toFixed(2);
  function renderAdminDashboard() {
    const employees = PMSStore.getEmployees();
    const dtr = PMSStore.getDTR();
    const leaves = PMSStore.getLeaves();

    document.getElementById("statEmployees").innerText = employees.length;
    document.getElementById("statPresent").innerText = new Set(dtr.filter(r => r.date === localToday()).map(r => r.empId)).size;
    document.getElementById("statLeaves").innerText = leaves.filter(l => l.status === "Pending").length;
    renderRail(employees, dtr);

    const tbody = document.getElementById("masterDtrBody");
    tbody.innerHTML = "";
    const filtered = dtrFiltered();
    document.getElementById('dtrCount').textContent = `${filtered.length} matching record${filtered.length === 1 ? '' : 's'}`;
    filtered.forEach(r => {
      const m = attendanceMetrics(r);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3">${r.date}</td>
        <td><span class="badge bg-secondary-subtle text-dark font-monospace">${r.empId}</span></td>
        <td class="fw-semibold">${r.name}</td>
        ${punchCells(r).map((t, i) => `<td class="${i % 2 ? 'text-danger' : 'text-success'} fw-bold">${t}</td>`).join('')}
        <td>${m.late > 0 ? `<span class="badge bg-danger">${m.late}m</span>` : '0'}</td>
        <td>${hoursLabel(m.hours)} hrs</td>
        <td><span class="badge ${statusClass(m.status)}">${m.status}</span></td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline-primary workforce-view-btn" onclick="window.viewProofModal('${r.empId}', '${r.date}')" title="View attendance proof" aria-label="View attendance proof">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    paginateTable('masterDtrBody');
  }

  function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function renderRail(employees, dtr) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    const sD = $("#payrollStart").val(), eD = $("#payrollEnd").val();
    const active = employees.filter(e => e.status === "Active");
    let gross = 0, ded = 0, net = 0;
    active.forEach(e => { const P = calcPay(e, sD, eD); gross += P.gross + P.otEarnings; ded += P.deductions; net += P.net; });
    const released = PMSStore.getReleasedPayslips();
    set("railReq", PMSStore.getRequests().filter(q => q.status === "Pending").length);
    set("railLeave", PMSStore.getLeaves().filter(l => l.status === "Pending").length);
    set("railRelease", active.filter(e => !released.includes(releaseKey(e.id, sD, eD))).length);
    set("railPeriod", `${sD} to ${eD}`);
    set("railGross", peso(gross)); set("railDed", "-" + peso(ded)); set("railNet", peso(net));
    set("statPayroll", peso(net));
    set("railRecords", dtr.filter(r => r.date === localToday()).length); set("railLate", dtr.filter(r => r.date === localToday() && attendanceMetrics(r).late > 0).length);
  }

  function renderEmpSummary() {
    const box = document.getElementById("empSummary");
    if (!box || !currentUser || currentUser.role !== "employee") return;
    const emp = PMSStore.getEmployees().find(e => e.id === currentUser.empId); if (!emp) return;
    const bal = emp.leaveBalance || { "Vacation Leave": 10, "Sick Leave": 10, "Emergency Leave": 3 };
    const mine = PMSStore.getDTR().filter(r => r.empId === emp.id);
    const late = mine.reduce((x, r) => x + attendanceMetrics(r).late, 0);
    const cell = (l, v, c) => `<div class="kpi ${c || ""}"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`;
    box.innerHTML = cell("Employee", `<span class="fs-6">${emp.name}</span><div class="kpi-sub">${emp.id} &middot; ${emp.role}</div>`, "kpi-accent") +
      cell("Vacation Leave", (bal["Vacation Leave"] ?? 0) + " days") + cell("Sick Leave", (bal["Sick Leave"] ?? 0) + " days") +
      cell("Emergency Leave", (bal["Emergency Leave"] ?? 0) + " days") + cell("Total Late", late + " mins");
  }
  // Default to the active semi-monthly cut-off instead of a hardcoded historical period.
  (() => {
    const now = new Date(), y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
    const last = String(new Date(y, now.getMonth()+1, 0).getDate()).padStart(2,'0');
    const firstHalf = now.getDate() <= 15;
    const from = `${y}-${m}-${firstHalf ? '01' : '16'}`;
    const to = `${y}-${m}-${firstHalf ? '15' : last}`;
    const a = document.getElementById('payrollStart'), b = document.getElementById('payrollEnd');
    if (a && b) { a.value = from; b.value = to; }
  })();
  document.getElementById("todayLabel").innerText = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  function renderAdminWorkforce() {
    const employees = PMSStore.getEmployees();
    const tbody = document.getElementById("workforceTableBody");
    tbody.innerHTML = "";

    const q = (document.getElementById('workforceSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('workforceStatus')?.value || '';
    const card = document.getElementById('workforceCard')?.value || '';
    const filtered = employees.filter(emp => {
      const matchText = [emp.id, emp.name, emp.role, emp.nfcTag].join(' ').toLowerCase().includes(q);
      const hasCard = !!String(emp.nfcTag || '').trim();
      return matchText && (!status || emp.status === status) && (!card || (card === 'assigned' ? hasCard : !hasCard));
    });
    const count = document.getElementById('workforceCount');
    if (count) count.textContent = `${filtered.length} of ${employees.length} employees`;
    filtered.forEach(emp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 font-monospace fw-bold text-primary">${emp.id}</td>
        <td class="fw-semibold">${emp.name}</td>
        <td>${esc(emp.role || '—')}</td>
        <td><span class="work-hours-pill"><i class="bi bi-clock"></i> ${esc(scheduleFor(emp,localToday()).scheduleStart)}–${esc(scheduleFor(emp,localToday()).scheduleEnd)}</span></td>
        <td class="text-nowrap">${peso(emp.baseSalary || 0)}</td>
        <td><span class="badge badge-soft-${emp.status === 'Active' ? 'success' : (emp.status === 'Retired' ? 'warning' : 'danger')}">${esc(emp.status)}</span></td>
        <td><span class="badge bg-dark font-monospace px-2 py-1">${esc(emp.nfcTag || 'NO CARD ASSIGNED')}</span></td>
        <td class="text-center"><div class="d-inline-flex gap-1"><button class="btn btn-sm btn-outline-secondary workforce-view-btn" onclick="window.openHistory('${emp.id}')" title="View employee details" aria-label="View employee details"><i class="bi bi-eye"></i></button><button class="btn btn-sm btn-outline-primary workforce-view-btn" onclick="window.editRfid('${emp.id}')" title="Edit RFID card" aria-label="Edit RFID card"><i class="bi bi-pencil"></i></button></div></td>
      `;
      tbody.appendChild(tr);
    });
    if (!filtered.length) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No employees match your search or filters.</td></tr>';
    paginateTable('workforceTableBody');
  }

  const editRfidModalEl = document.getElementById('editRfidModal');
  const editRfidModal = editRfidModalEl && window.bootstrap ? bootstrap.Modal.getOrCreateInstance(editRfidModalEl) : null;
  window.editRfid = function(empId) {
    const emp = PMSStore.getEmployees().find(e => e.id === empId);
    if (!emp) return;
    document.getElementById('editRfidEmployeeId').value = emp.id;
    document.getElementById('editRfidEmployeeName').value = `${emp.name} (${emp.id})`;
    document.getElementById('editRfidTag').value = emp.nfcTag || '';
    document.getElementById('editRfidError').classList.add('d-none');
    if (editRfidModal) editRfidModal.show();
  };
  document.getElementById('editRfidForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const empId = document.getElementById('editRfidEmployeeId').value;
    const tag = document.getElementById('editRfidTag').value.trim().toUpperCase();
    const error = document.getElementById('editRfidError');
    const duplicate = tag && PMSStore.getEmployees().some(e => e.id !== empId && String(e.nfcTag || '').trim().toUpperCase() === tag);
    if (duplicate) {
      error.textContent = 'This RFID card is already assigned to another employee.';
      error.classList.remove('d-none');
      return;
    }
    if (PMSStore.updateEmployeeRfid(empId, tag)) {
      editRfidModal?.hide();
      renderAdminWorkforce();
    }
  });

  ['workforceSearch'].forEach(id => document.getElementById(id).addEventListener('input', () => { tablePages.set('workforceTableBody', 1); renderAdminWorkforce(); }));
  ['workforceStatus','workforceCard'].forEach(id => document.getElementById(id).addEventListener('change', () => { tablePages.set('workforceTableBody', 1); renderAdminWorkforce(); }));
  document.getElementById('workforceClear').addEventListener('click', () => {
    tablePages.set('workforceTableBody', 1);
    ['workforceSearch','workforceStatus','workforceCard'].forEach(id => document.getElementById(id).value = '');
    renderAdminWorkforce();
  });

  const releaseKey = (id, start, end) => `${start}|${end}|${id}`;
  const selectedReleaseKey = id => releaseKey(id, $("#payrollStart").val(), $("#payrollEnd").val());
  function renderAdminPayroll() {
    const sDate = $("#payrollStart").val();
    const eDate = $("#payrollEnd").val();
    document.getElementById("cutoffLabel").innerText = `${sDate} to ${eDate}`;

    const employees = PMSStore.getEmployees();
    const dtr = PMSStore.getDTR();
    const released = PMSStore.getReleasedPayslips();

    let grandBasic = 0, grandGross = 0, grandOt = 0, grandDeductions = 0, grandNet = 0;
    const tbody = document.getElementById("payrollSummaryBody");
    tbody.innerHTML = "";

    const payrollQuery = (document.getElementById('payrollSearch')?.value || '').trim().toLowerCase();
    const payrollStatus = document.getElementById('payrollStatus')?.value || '';
    employees.forEach(emp => {
      if (emp.status !== "Active") return;
      if (payrollQuery && !`${emp.id} ${emp.name}`.toLowerCase().includes(payrollQuery)) return;
      const periodRecords = dtr.filter(r => r.empId === emp.id && r.date >= sDate && r.date <= eDate);
      let attendanceStatus = 'Incomplete';
      if (periodRecords.some(r => !attendanceMetrics(r).complete || attendanceMetrics(r).status === 'Incomplete')) attendanceStatus = 'Incomplete';
      else if (periodRecords.some(r => attendanceMetrics(r).status === 'Early Out')) attendanceStatus = 'Early Out';
      else if (periodRecords.some(r => attendanceMetrics(r).status === 'Late')) attendanceStatus = 'Late';
      else if (periodRecords.length) attendanceStatus = 'Present';
      if (payrollStatus && attendanceStatus !== payrollStatus) return;

      const pay = payFor(emp, sDate, eDate);
      const { basic, gross, otEarnings, deductions, net } = pay;
      const dedTip = pay.sss === undefined ? `Gov't contributions ${peso(pay.gov)}, tax and loans ${peso(pay.taxLoan)}, late ${peso(pay.late)}, unpaid leave ${peso(pay.leaveDed)}` : `SSS ${peso(pay.sss)}, PhilHealth ${peso(pay.philhealth)}, Pag-IBIG ${peso(pay.pagibig)}, Tax ${peso(pay.tax)}, Loan ${peso(pay.loan)}, Late ${peso(pay.late)}, Undertime ${peso(pay.undertime||0)}, Credited hours ${Number(pay.creditedHours||0).toFixed(2)}, Unpaid leave ${peso(pay.leaveDed)}`;

      grandBasic += basic;
      grandGross += gross;
      grandOt += otEarnings;
      grandDeductions += deductions;
      grandNet += net;

      const isReleased = released.includes(selectedReleaseKey(emp.id));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center font-monospace">${emp.id}</td>
        <td class="fw-bold">${emp.name}</td>
        <td class="text-end">₱${basic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td class="text-end no-print">₱${gross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td class="text-end text-success no-print">+₱${otEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td class="text-end text-danger" title="${esc(dedTip)}">-₱${deductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td class="text-end fw-bold fs-6">₱${net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        <td class="text-center no-print">
          ${emp.status === 'Retired' ? '<span class="text-muted small">N/A</span>' : `
            <button class="btn btn-sm ${isReleased ? 'btn-outline-success' : 'btn-primary'} py-0" onclick="window.toggleRelease('${emp.id}')">
              <i class="bi bi-${isReleased ? 'check-circle' : 'send'} me-1"></i>${isReleased ? 'Released' : 'Release'}
            </button>
          `}
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("grandBasic").innerText = `₱${grandBasic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("grandGross").innerText = `₱${grandGross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("grandOt").innerText = `₱${grandOt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("grandDeductions").innerText = `-₱${grandDeductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("grandNet").innerText = `₱${grandNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById("statPayroll").innerText = `₱${grandNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    paginateTable('payrollSummaryBody');
  }

  $("#btnFilterPayroll").on("click", () => { tablePages.set('payrollSummaryBody', 1); renderAdminPayroll(); });
  
  document.getElementById('payrollReset')?.addEventListener('click', () => {
    tablePages.set('payrollSummaryBody', 1);
    document.getElementById('payrollSearch').value = '';
    document.getElementById('payrollStatus').value = '';
    const now = new Date(), y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
    const last = String(new Date(y, now.getMonth()+1, 0).getDate()).padStart(2,'0');
    const firstHalf = now.getDate() <= 15;
    document.getElementById('payrollStart').value = `${y}-${m}-${firstHalf ? '01' : '16'}`;
    document.getElementById('payrollEnd').value = `${y}-${m}-${firstHalf ? '15' : last}`;
    renderAdminPayroll();
  });

  const releaseSnapshot = (emp, start, end) => {
    const pay = calcPay(emp, start, end);
    return { empId: emp.id, name: emp.name, role: emp.role, periodStart: start, periodEnd: end, pay, releasedAt: new Date().toISOString() };
  };
  let releaseInProgress = false;
  async function saveReleaseChanges(changes, successMessage) {
    if (releaseInProgress) return;
    releaseInProgress = true;
    const buttons = document.querySelectorAll('#btnReleaseAll, #payrollSummaryBody button');
    buttons.forEach(button => button.disabled = true);
    try {
      for (const [key, record] of changes) PMSStore.setPayrollRecord(key, record);
      await PMSStore.flushToServer();
      // Read the saved state back from the server, rather than trusting a local UI update.
      const response = await fetch('/api/v1/sync?verify=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('Cannot verify server payroll data.');
      const server = await response.json();
      if (!server.state || !server.state.payrollRecords) throw new Error('Payroll records are missing on the server.');
      for (const [key, record] of changes) {
        const saved = server.state.payrollRecords[key];
        if (!saved || saved.status !== record.status ||
            (record.status === 'released' && (!saved.snapshot || saved.snapshot.empId !== record.snapshot.empId))) {
          throw new Error('Server has not confirmed the payroll release.');
        }
      }
      alert(successMessage);
    } catch (error) {
      alert('Payroll sync failed: ' + error.message + '\nPlease verify the sync badge and retry.');
    } finally {
      releaseInProgress = false;
      renderAdminPayroll();
    }
  }
  $('#btnReleaseAll').on('click', async () => {
    const start = $('#payrollStart').val(), end = $('#payrollEnd').val();
    if (!start || !end || end < start) return alert('Select a valid payroll period.');
    const changes = PMSStore.getEmployees().filter(e => e.status === 'Active').map(emp => [
      releaseKey(emp.id, start, end),
      { status: 'released', snapshot: releaseSnapshot(emp, start, end) }
    ]);
    if (!changes.length) return alert('No active employees to release.');
    await saveReleaseChanges(changes, `Confirmed: ${changes.length} payslip(s) released and saved to the server.`);
  });
  window.toggleRelease = async function(empId) {
    const start = $('#payrollStart').val(), end = $('#payrollEnd').val();
    if (!start || !end || end < start) return alert('Select a valid payroll period.');
    const key = releaseKey(empId, start, end);
    const old = PMSStore.getPayrollRecord(key);
    if (old?.status === 'released') {
      await saveReleaseChanges([[key, { status: 'withdrawn', snapshot: old.snapshot || null }]],
        `Confirmed: payslip for ${empId} withdrawn on the server.`);
    } else {
      const emp = PMSStore.getEmployees().find(e => e.id === empId && e.status === 'Active');
      if (!emp) return alert('Only active employees may receive a payslip.');
      await saveReleaseChanges([[key, { status: 'released', snapshot: releaseSnapshot(emp, start, end) }]],
        `Confirmed: payslip for ${empId} released and saved to the server.`);
    }
  };

  function renderAdminAppraisals() {
    const appraisals = PMSStore.getAppraisals();
    const aTbody = document.getElementById("appraisalTableBody");
    aTbody.innerHTML = "";
    const aq = (document.getElementById('appraisalSearch')?.value || '').trim().toLowerCase();
    const af = document.getElementById('appraisalFrom')?.value || '';
    const at = document.getElementById('appraisalTo')?.value || '';
    const filteredAppraisals = appraisals.filter(a => (!aq || `${a.controlNo || a.id || ''} ${a.name} ${a.empId || ''} ${a.remarks || ''}`.toLowerCase().includes(aq)) && (!af || a.effectiveDate >= af) && (!at || a.effectiveDate <= at));
    document.getElementById('appraisalResults').textContent = `${filteredAppraisals.length} of ${appraisals.length} salary changes`;
    if (!filteredAppraisals.length) aTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No matching salary changes.</td></tr>';
    filteredAppraisals.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 font-monospace fw-bold text-primary">${esc(a.controlNo || a.id || '—')}</td>
        <td class="fw-semibold">${esc(a.name)}</td>
        <td class="text-muted text-decoration-line-through">₱${a.oldSalary.toLocaleString()}</td>
        <td class="text-success fw-bold">₱${a.newSalary.toLocaleString()}</td>
        <td>${a.effectiveDate}</td>
        <td><span class="badge bg-light text-dark">${a.remarks}</span></td>
      `;
      aTbody.appendChild(tr);
    });
    paginateTable('appraisalTableBody');

    const leaves = PMSStore.getLeaves();
    const lTbody = document.getElementById("adminLeavesBody");
    lTbody.innerHTML = "";
    const typeSelect = document.getElementById('adminLeaveType');
    const lq = (document.getElementById('adminLeaveSearch')?.value || '').trim().toLowerCase();
    const ls = document.getElementById('adminLeaveStatus')?.value || '';
    const lf = document.getElementById('adminLeaveFrom')?.value || '';
    const lt = document.getElementById('adminLeaveTo')?.value || '';
    const shownLeaves = leaves.filter(l => (!lq || `${l.controlNo} ${l.name} ${l.empId || ''} ${l.type} ${l.reason || ''}`.toLowerCase().includes(lq)) && (!typeSelect.value || l.type === typeSelect.value) && (!ls || l.status === ls) && (!lf || (l.endDate || l.date) >= lf) && (!lt || l.date <= lt));
    document.getElementById('adminLeaveResults').textContent = `${shownLeaves.length} of ${leaves.length} leave records`;
    if (!shownLeaves.length) lTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No matching leave records.</td></tr>';
    shownLeaves.forEach(l => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 font-monospace fw-bold text-primary">${l.controlNo}</td>
        <td>${l.name}</td>
        <td>${esc(l.type)}${l.reason ? `<div class="text-muted leave-reason">${esc(l.reason)}</div>` : ""}</td>
        <td>${l.date}${l.endDate && l.endDate !== l.date ? " to " + l.endDate : ""} (${l.days || 1}d)</td>
        <td>${l.proofPath ? `<a class="proof-link" href="${esc(l.proofPath)}" target="_blank" rel="noopener"><i class="bi bi-paperclip"></i>${esc(l.proofName || "View")}</a>` : `<span class="text-muted">None</span>`}</td>
        <td>${l.status === "Pending"
          ? `<div class="row-actions no-print approval-actions"><button class="btn btn-sm btn-success" onclick="window.decideLeave('${l.controlNo}','Approved')"><i class="bi bi-check2 me-1"></i>Approve</button><button class="btn btn-sm btn-outline-danger" onclick="window.decideLeave('${l.controlNo}','Rejected')"><i class="bi bi-x-lg me-1"></i>Reject</button></div>`
          : `<span class="badge bg-${l.status === "Approved" ? "success" : "danger"}">${l.status}</span>`}</td>
      `;
      lTbody.appendChild(tr);
    });
    paginateTable('adminLeavesBody');
  }

  ['appraisalSearch','appraisalFrom','appraisalTo','adminLeaveSearch','adminLeaveType','adminLeaveStatus','adminLeaveFrom','adminLeaveTo'].forEach(id => {
    document.getElementById(id)?.addEventListener(id.endsWith('Search') ? 'input' : 'change', () => { tablePages.set(id.startsWith('appraisal') ? 'appraisalTableBody' : 'adminLeavesBody', 1); renderAdminAppraisals(); });
  });
  document.getElementById('appraisalReset')?.addEventListener('click', () => {
    tablePages.set('appraisalTableBody', 1);
    ['appraisalSearch','appraisalFrom','appraisalTo'].forEach(id => document.getElementById(id).value = '');
    renderAdminAppraisals();
  });
  document.getElementById('adminLeaveReset')?.addEventListener('click', () => {
    tablePages.set('adminLeavesBody', 1);
    ['adminLeaveSearch','adminLeaveType','adminLeaveStatus','adminLeaveFrom','adminLeaveTo'].forEach(id => document.getElementById(id).value = '');
    renderAdminAppraisals();
  });

  function renderEmpDtr() {
    if (!currentUser || currentUser.role !== "employee") return;
    renderEmpSummary();
    const dtr = PMSStore.getDTR();
    const myLogs = dtr.filter(r => r.empId === currentUser.empId);
    const tbody = document.getElementById("empPersonalDtrBody");
    tbody.innerHTML = "";

    const q = (document.getElementById('empDtrSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('empDtrStatus')?.value || '';
    const from = document.getElementById('empDtrFrom')?.value || '';
    const to = document.getElementById('empDtrTo')?.value || '';
    const shown = myLogs.filter(r => (!q || `${r.date} ${r.status} ${punchCells(r).join(' ')}`.toLowerCase().includes(q)) && attendanceStatusMatches(r, status) && (!from || r.date >= from) && (!to || r.date <= to));
    const summary = document.getElementById('empDtrResults');
    if (summary) summary.textContent = `${shown.length} of ${myLogs.length} records · ${shown.reduce((n,r)=>n+attendanceMetrics(r).hours,0).toFixed(2)} hours · ${shown.reduce((n,r)=>n+attendanceMetrics(r).late,0)} late minutes`;
    if (!shown.length) tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No matching attendance records.</td></tr>';
    shown.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3">${r.date}</td>
        ${punchCells(r).map((t, i) => `<td class="${i % 2 ? 'text-danger' : 'text-success'} fw-bold">${t}</td>`).join('')}
        <td>${attendanceMetrics(r).late} mins</td>
        <td>${hoursLabel(attendanceMetrics(r).hours)} hrs</td>
        <td><span class="badge ${statusClass(attendanceMetrics(r).status)}">${attendanceMetrics(r).status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary workforce-view-btn" onclick="window.viewProofModal('${r.empId}', '${r.date}')" title="View attendance proof" aria-label="View attendance proof">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    paginateTable('empPersonalDtrBody');
  }

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Keep data tables compact on laptop screens: five visible rows per page.
  const tablePages = new Map();
  function paginateTable(tbodyId, resetPage = false) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
    const responsive = tbody.closest('.table-responsive');
    if (!responsive) return;
    const pagerId = `pager-${tbodyId}`;
    let pager = document.getElementById(pagerId);
    if (!pager) {
      pager = document.createElement('div');
      pager.id = pagerId;
      pager.className = 'tap-pagination no-print';
      responsive.insertAdjacentElement('afterend', pager);
    }
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    let page = resetPage ? 1 : (tablePages.get(tbodyId) || 1);
    page = Math.min(Math.max(1, page), totalPages);
    tablePages.set(tbodyId, page);
    rows.forEach((row, i) => { row.hidden = i < (page - 1) * pageSize || i >= page * pageSize; });
    if (rows.length <= pageSize) { pager.innerHTML = ''; pager.classList.add('d-none'); return; }
    pager.classList.remove('d-none');
    // Bootstrap pagination component (keeps the compact < 2 > layout requested).
    pager.innerHTML = `<nav aria-label="Table pagination" class="d-flex align-items-center justify-content-center gap-2"><ul class="pagination pagination-sm mb-0">
      <li class="page-item ${page === 1 ? 'disabled' : ''}"><button type="button" class="page-link" data-page-action="prev" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>&lsaquo;</button></li>
      <li class="page-item"><label class="visually-hidden" for="${pagerId}-input">Go to page</label><input id="${pagerId}-input" class="form-control form-control-sm tap-page-input" type="number" min="1" max="${totalPages}" value="${page}" inputmode="numeric" aria-label="Current page, ${totalPages} pages total"></li>
      <li class="page-item active"><span class="page-link tap-page-total">of ${totalPages}</span></li>
      <li class="page-item ${page === totalPages ? 'disabled' : ''}"><button type="button" class="page-link" data-page-action="next" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}>&rsaquo;</button></li>
    </ul></nav>`;
    pager.querySelector('[data-page-action="prev"]')?.addEventListener('click', () => { tablePages.set(tbodyId, Math.max(1, page - 1)); paginateTable(tbodyId); });
    pager.querySelector('[data-page-action="next"]')?.addEventListener('click', () => { tablePages.set(tbodyId, Math.min(totalPages, page + 1)); paginateTable(tbodyId); });
    const pageInput = pager.querySelector('.tap-page-input');
    const goToPage = () => { const requested = Number.parseInt(pageInput.value, 10); const safePage = Number.isFinite(requested) ? Math.min(totalPages, Math.max(1, requested)) : page; tablePages.set(tbodyId, safePage); paginateTable(tbodyId); };
    pageInput.addEventListener('change', goToPage);
    pageInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); goToPage(); } });
  }
  function attendanceStatusMatches(record, selected) {
    if (!selected) return true;
    const metrics = attendanceMetrics(record);
    if (selected === 'Incomplete') return !metrics.complete || metrics.status === 'Incomplete' || /Incomplete/i.test(record.status || '');
    if (selected === 'Early Out') return metrics.status === 'Early Out' || /Early Out/i.test(record.status || '');
    if (selected === 'Late') return metrics.status === 'Late' || /Late/i.test(record.status || '');
    if (selected === 'Present') return metrics.complete && metrics.status !== 'Early Out' && metrics.status !== 'Late' && !/Late|Early Out|Incomplete/i.test(record.status || '');
    return true;
  }
  async function uploadLeaveFile(file, ctrlNo) {
    const fd = new FormData(); fd.append("file", file); fd.append("controlNo", ctrlNo);
    try { const r = await fetch("/api/v1/uploads/leave", { method: "POST", body: fd }); const t = await r.text(); const res = JSON.parse(t); return res.ok ? { path: res.path } : { error: res.error }; }
    catch (err) { return { error: "cannot reach the server" }; }
  }

  function renderEmpLeaveRequests() {
    if (!currentUser || currentUser.role !== 'employee') return;
    const tbody = document.getElementById('empLeaveRequestsBody');
    if (!tbody) return;
    const search = (document.getElementById('empLeaveSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('empLeaveStatus')?.value || '';
    const rows = PMSStore.getLeaves().filter(l => l.empId === currentUser.empId && (!status || l.status === status) && (!search || `${l.controlNo} ${l.type} ${l.reason || ''} ${l.date} ${l.endDate || ''}`.toLowerCase().includes(search)));
    tbody.innerHTML = rows.map(l => `<tr><td class="ps-3 font-monospace">${esc(l.controlNo)}</td><td>${esc(l.type)}</td><td>${esc(l.date)}${l.endDate && l.endDate !== l.date ? ` to ${esc(l.endDate)}` : ''}</td><td>${esc(l.days || 1)}</td><td>${l.proofPath ? `<a class="proof-link" href="${esc(l.proofPath)}" target="_blank" rel="noopener"><i class="bi bi-paperclip"></i> ${esc(l.proofName || 'View file')}</a>` : '<span class="text-muted">None</span>'}</td><td>${stBadge(l.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted py-3">No leave requests filed yet.</td></tr>';
    paginateTable('empLeaveRequestsBody');
  }
  ['empLeaveSearch', 'empLeaveStatus'].forEach(id => document.getElementById(id)?.addEventListener(id === 'empLeaveSearch' ? 'input' : 'change', () => { tablePages.set('empLeaveRequestsBody', 1); renderEmpLeaveRequests(); }));
  document.getElementById('empLeaveReset')?.addEventListener('click', () => { tablePages.set('empLeaveRequestsBody', 1); document.getElementById('empLeaveSearch').value = ''; document.getElementById('empLeaveStatus').value = ''; renderEmpLeaveRequests(); });

  $("#formEmpLeave").on("submit", async (e) => {
    e.preventDefault();
    const type = $("#empLeaveType").val();
    const date = $("#empLeaveDate").val();
    const endDate = $("#empLeaveEnd").val();
    const days = workDays(date, endDate);
    if (days < 1) { alert("Invalid dates. The range must include at least one working day."); return; }
    const ctrlNo = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const form = e.target, btn = form.querySelector("button[type=submit]");

    const file = document.getElementById("empLeaveProof").files[0];
    let proofPath = null, proofName = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("The attachment is over 5 MB."); return; }
      btn.disabled = true; btn.innerText = "Uploading...";
      const up = await uploadLeaveFile(file, ctrlNo);
      btn.disabled = false; btn.innerText = "Submit";
      if (!up.path) { alert("Attachment upload failed: " + up.error + ". Please try again."); return; }
      proofPath = up.path; proofName = file.name;
    }

    PMSStore.saveLeave({
      controlNo: ctrlNo,
      empId: currentUser.empId,
      name: currentUser.name,
      type: type,
      reason: $("#empLeaveReason").val().trim(),
      date: date, startDate: date, endDate: endDate, days: days,
      status: "Pending",
      proofAttached: !!proofPath, proofPath: proofPath, proofName: proofName
    });

    alert(`Leave request submitted. Control No.: ${ctrlNo}\n${days} working day(s), pending approval.`);
    document.getElementById("empLeaveDays").innerText = "0";
    form.reset();
    renderEmpLeaveRequests();
  });

  const reqDetail = q => q.kind === "Overtime" ? `${q.date} | ${q.hours}h OT` : q.kind === "Schedule Change" ? `${q.date} | ${q.schedType}: ${q.schedDays}` : `${q.date} | ${[['AM In',q.timeIn],['AM Out',q.timeOut],['PM In',q.timeIn2],['PM Out',q.timeOut2]].filter(([,v])=>v).map(([label,v])=>`${label} ${v}`).join(' · ') || 'Missing time record'}`;
  const stBadge = s => `<span class="badge bg-${s === "Approved" ? "success" : s === "Pending" ? "warning text-dark" : "danger"}">${s}</span>`;
  const requestAttachmentLink = q => {
    if (!q.attachmentPath || !/^proofs\/REQUEST_[A-Za-z0-9-]+\.(?:jpg|png|pdf)$/.test(q.attachmentPath)) return '';
    return `<div class="mt-1"><a class="small fw-semibold no-print" href="${esc(q.attachmentPath)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-paperclip"></i> View attachment${q.attachmentName ? ` (${esc(q.attachmentName)})` : ''}</a></div>`;
  };
  document.getElementById('reqAttachment')?.addEventListener('change', e => {
    const file = e.target.files[0];
    document.getElementById('reqAttachmentHint').textContent = file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'JPG, PNG, or PDF • Maximum 5 MB';
  });
  function renderEmpRequests() {
    if (!currentUser || currentUser.role !== "employee") return;
    const search = (document.getElementById('empReqSearch')?.value || '').trim().toLowerCase();
    const status = document.getElementById('empReqStatus')?.value || '';
    document.getElementById("empRequestsBody").innerHTML = PMSStore.getRequests().filter(q => q.empId === currentUser.empId && (!status || q.status === status) && (!search || `${q.controlNo} ${q.kind} ${q.reason} ${q.date}`.toLowerCase().includes(search))).map(q =>
      `<tr><td class="ps-3 font-monospace">${q.controlNo}</td><td>${q.kind}</td><td>${reqDetail(q)}<div class="text-muted">${esc(q.reason)}</div>${requestAttachmentLink(q)}</td><td>${stBadge(q.status)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-center text-muted py-3">No requests filed yet.</td></tr>`;
    paginateTable('empRequestsBody');
  }
  function renderApprovals() {
    const f = $("#apprFrom").val(), t = $("#apprTo").val();
    document.getElementById("adminRequestsBody").innerHTML = requestsFiltered().map(q =>
      `<tr><td class="ps-3 font-monospace">${q.controlNo}</td><td>${q.name}<div class="text-muted">${q.empId}</div></td><td>${q.kind}</td><td>${reqDetail(q)}<div class="text-muted">${esc(q.reason)}</div>${requestAttachmentLink(q)}</td>
      <td>${q.status === "Pending" ? `<div class="row-actions no-print approval-actions"><button class="btn btn-sm btn-success" onclick="window.decideRequest('${q.controlNo}','Approved')"><i class="bi bi-check2 me-1"></i>Approve</button><button class="btn btn-sm btn-outline-danger" onclick="window.decideRequest('${q.controlNo}','Rejected')"><i class="bi bi-x-lg me-1"></i>Reject</button></div>` : stBadge(q.status)}</td></tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted py-3">No requests found.</td></tr>`;
    paginateTable('adminRequestsBody');
  }
  document.getElementById('apprReset')?.addEventListener('click', () => { tablePages.set('adminRequestsBody', 1); ['apprSearch','apprStatus','apprFrom','apprTo'].forEach(id => document.getElementById(id).value = ''); renderApprovals(); });
  const to12 = hm => { let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + ap; };
  $("#reqKind").on("change", () => {
    const k = $("#reqKind").val();
    $("#reqHours").toggleClass("d-none", k !== "Overtime");
    $("#reqSched").toggleClass("d-none", k !== "Schedule Change");
    $("#reqManual").toggleClass("d-none", k !== "Manual Attendance");
  });
  $("#formRequest").on("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const k = $("#reqKind").val();
    const q = { controlNo: `REQ-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, kind: k, empId: currentUser.empId, name: currentUser.name, date: $("#reqDate").val(), reason: $("#reqReason").val(), status: "Pending" };
    if (k === "Overtime") { q.hours = $("#reqHours").val(); if (!(Number(q.hours) > 0)) { alert("Enter the overtime hours."); return; } }
    if (k === "Schedule Change") { q.schedType = $("#reqSchedType").val(); q.schedDays = $("#reqSchedDays").val(); if (!q.schedDays) { alert("Enter the schedule days."); return; } }
    if (k === "Manual Attendance") {
      q.timeIn = $("#reqIn").val(); q.timeOut = $("#reqOut").val(); q.timeIn2 = $("#reqIn2").val(); q.timeOut2 = $("#reqOut2").val();
      const date = q.date;
      if (!date) { alert("Choose the attendance date."); return; }
      if (date > localToday()) { alert("You cannot file manual attendance for a future date."); return; }
      if (![q.timeIn,q.timeOut,q.timeIn2,q.timeOut2].some(Boolean)) { alert("Enter at least one missing time record."); return; }
      const existing = PMSStore.getDTR().find(r => r.empId === q.empId && r.date === date) || {};
      const to24 = value => {
        if (!value || value === '--') return '';
        const m = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (m) return String((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)).padStart(2,'0') + ':' + m[2];
        return /^\d{2}:\d{2}$/.test(value) ? value : '';
      };
      const incoming = [q.timeIn,q.timeOut,q.timeIn2,q.timeOut2];
      const current = [existing.timeIn,existing.timeOut,existing.timeIn2,existing.timeOut2].map(to24);
      for (let i=0;i<incoming.length;i++) if (current[i] && incoming[i]) { alert('This time is already recorded. Leave it blank; existing kiosk punches cannot be overwritten.'); return; }
      const merged = current.map((v,i) => v || incoming[i] || '');
      if ((merged[1] && !merged[0]) || (merged[3] && !merged[2])) { alert("A time-out needs its matching time-in. Please enter the missing in-time first."); return; }
      const minutes = v => v ? Number(v.slice(0,2))*60 + Number(v.slice(3,5)) : null;
      const present = merged.map((v,i)=>v ? {i,m:minutes(v)} : null).filter(Boolean);
      for (let i=1;i<present.length;i++) if (present[i].m < present[i-1].m || (present[i].i===2 && present[i-1].i===1 && present[i].m < present[i-1].m)) { alert("Times must follow the correct order: AM In, AM Out, PM In, PM Out."); return; }
      if (date === localToday()) {
        const now = new Date(), nowMins = now.getHours()*60 + now.getMinutes();
        for (let i=0;i<incoming.length;i++) if (incoming[i] && minutes(incoming[i]) > nowMins) { alert("Future times are not allowed for today's attendance."); return; }
      }
    }
    const file = document.getElementById('reqAttachment').files[0];
    if (file) {
      const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
      if (file.size > 5 * 1024 * 1024 || !allowed.includes(file.type)) { alert('Only JPG, PNG, or PDF files up to 5 MB are allowed.'); return; }
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = file ? 'Uploading attachment...' : 'Submitting...';
    try {
      if (file) {
        const fd = new FormData(); fd.append('file', file); fd.append('controlNo', q.controlNo);
        let res;
        try {
          const response = await fetch('/api/v1/uploads/request', { method: 'POST', body: fd });
          res = await response.json();
          if (!response.ok || !res.ok) throw new Error(res.error || 'Server upload error');
        } catch (err) { alert('Attachment upload failed: ' + err.message + '. Request was not submitted.'); return; }
        q.attachmentPath = res.path; q.attachmentName = file.name;
      }
      PMSStore.saveRequest(q);
      alert(`Request submitted. Control No.: ${q.controlNo}`);
      form.reset();
      document.getElementById('reqAttachmentHint').textContent = 'JPG, PNG, or PDF • Maximum 5 MB';
      document.getElementById('reqKind').dispatchEvent(new Event('change'));
      renderEmpRequests();
    } finally { btn.disabled = false; btn.textContent = 'Submit'; }
  });
  window.decideRequest = function(controlNo, decision) {
    const q = PMSStore.getRequests().find(x => x.controlNo === controlNo);
    if (!q || q.status !== "Pending") return;
    if (decision === "Approved" && q.kind === "Manual Attendance") {
      const existing = PMSStore.getDTR().find(r => r.empId === q.empId && r.date === q.date);
      const blank = v => !v || v === '--';
      const rec = existing ? { ...existing } : {
        v: 2, date: q.date, empId: q.empId, name: q.name,
        timeIn: '--', timeOut: '--', timeIn2: '--', timeOut2: '--',
        lateMinutes: 0, renderedHours: 0, overtimeHours: 0,
        status: 'Manual (Approved)', photoIn: null, photoOut: null, photoIn2: null, photoOut2: null,
        photoProof: (PMSStore.getEmployees().find(x => x.id === q.empId) || {}).photoUrl
      };
      // Merge only into missing punches. Existing kiosk punches and their photos are never overwritten.
      const map = [['timeIn','photoIn','timeIn'],['timeOut','photoOut','timeOut'],['timeIn2','photoIn2','timeIn2'],['timeOut2','photoOut2','timeOut2']];
      map.forEach(([field,photoField,qField]) => {
        if (blank(rec[field]) && q[qField]) rec[field] = to12(q[qField]);
      });
      rec.v = 2;
      rec.status = 'Manual (Approved)';
      const mm = attendanceMetrics(rec); rec.lateMinutes = mm.late; rec.renderedHours = mm.hours;
      if (!mm.complete) rec.status = 'Incomplete';
      PMSStore.saveDTRRecord(rec);
    }
    q.status = decision; PMSStore.saveRequest(q); renderApprovals();
  };

  const peso = n => "₱" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Statutory deductions, itemized. Computed from the MONTHLY rate, then split in two for the semi-monthly cut-off.
  // Simplified demo rules (rates can be swapped here without touching any screen):
  //   SSS        5% employee share of the Monthly Salary Credit (rate rounded to P500, min P5,000, max P35,000)
  //   PhilHealth 2.5% employee share of the rate (rate floor P10,000, ceiling P100,000)
  //   Pag-IBIG   2% of the rate, base capped at P10,000 (max P200 a month)
  //   Tax        TRAIN monthly withholding table, on the rate minus the three contributions above
  // An employee record can override any line with a per-cut-off amount: emp.sss, emp.philhealth, emp.pagibig, emp.tax, emp.loan.
  const r2 = n => Math.round(n * 100) / 100;
  function statutoryMonthly(m) {
    const sss = Math.min(35000, Math.max(5000, Math.round(m / 500) * 500)) * 0.05;
    const philhealth = Math.min(100000, Math.max(10000, m)) * 0.025;
    const pagibig = Math.min(m, 10000) * 0.02;
    const t = m - sss - philhealth - pagibig;
    const tax = t <= 20833 ? 0 : t <= 33333 ? (t - 20833) * 0.15 : t <= 66667 ? 1875 + (t - 33333) * 0.20 : t <= 166667 ? 8541.80 + (t - 66667) * 0.25 : t <= 666667 ? 33541.80 + (t - 166667) * 0.30 : 183541.80 + (t - 666667) * 0.35;
    return { sss, philhealth, pagibig, tax };
  }
  // ONE computation used by the payroll table, payslip modal and employee payslip list
  function calcPay(emp, sDate, eDate) {
    const z = { basic: 0, gross: 0, otEarnings: 0, deductions: 0, net: 0, late: 0, undertime: 0, creditedHours: 0, sss: 0, philhealth: 0, pagibig: 0, tax: 0, loan: 0, gov: 0, taxLoan: 0, leaveDed: 0 };
    if (emp.status !== "Active") return z;
    const sal = EMS.salaryOn(emp, eDate), hr = sal / 26 / 8;
    const inRange = d => d >= sDate && d <= eDate;
    const periodDtr = PMSStore.getDTR().filter(r => r.empId === emp.id && inRange(r.date));
    const validatedDtr = periodDtr.filter(r => attendanceMetrics(r).complete || /Manual \(Approved\)/i.test(r.status || ''));
    const lateMin = validatedDtr.reduce((x, r) => x + attendanceMetrics(r).late, 0);
    const underMin = validatedDtr.reduce((x, r) => x + attendanceMetrics(r).undertime, 0);
    const creditedHours = Math.round(validatedDtr.reduce((x,r)=>x+attendanceMetrics(r).hours,0)*100)/100;
    const otHrs = PMSStore.getRequests().filter(q => q.kind === "Overtime" && q.status === "Approved" && q.empId === emp.id && inRange(q.date)).reduce((x, q) => x + Number(q.hours || 0), 0);
    const unpaid = PMSStore.getLeaves().filter(l => l.empId === emp.id && l.status === "Approved" && inRange(l.startDate || l.date)).reduce((x, l) => x + (l.unpaidDays || 0), 0);
    const late = r2(lateMin * (hr / 60)), undertime = r2(underMin * (hr / 60)), ot = r2(otHrs * hr * 1.25), leaveDed = r2(unpaid * (sal / 26));
    const st = statutoryMonthly(sal), pick = (v, auto) => v !== undefined && v !== null && v !== "" ? Number(v) : r2(auto / 2);
    const sss = pick(emp.sss, st.sss), philhealth = pick(emp.philhealth, st.philhealth), pagibig = pick(emp.pagibig, st.pagibig), tax = pick(emp.tax, st.tax), loan = pick(emp.loan, 0);
    const deductions = r2(late + undertime + sss + philhealth + pagibig + tax + loan + leaveDed), gross = r2(sal / 2);
    // gov / taxLoan = grouped totals, kept so payslips released before the itemized version still display
    return { basic: sal, gross, otEarnings: ot, deductions, net: r2(gross + ot - deductions), late, undertime, creditedHours, sss, philhealth, pagibig, tax, loan, gov: sss + philhealth + pagibig, taxLoan: tax + loan, leaveDed };
  }
  // A released payslip is a frozen snapshot; anything else is computed live.
  const payFor = (emp, s, e) => { const rec = PMSStore.getPayrollRecord(releaseKey(emp.id, s, e)); return rec?.status === "released" && rec.snapshot ? rec.snapshot.pay : calcPay(emp, s, e); };

  // Print a standalone report, preserving the control number and selected date range.
  const val = id => document.getElementById(id).value;
  const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:2,maximumFractionDigits:2});
  const reportDate = d => d || "All dates";
  // Same certification block as the payroll report, used by every printout.
  const SIGN_SETS = {
    'Payroll': ['PAYROLL CERTIFICATION & APPROVAL', [['Prepared by','Payroll Officer'],['Reviewed by','HR Manager'],['Approved by','Authorized Approver']]],
    'Attendance': ['ATTENDANCE REPORT CERTIFICATION', [['Prepared by','Attendance Officer'],['Reviewed by','HR Manager'],['Approved by','Authorized Approver']]],
    'Requests and Approvals': ['REQUESTS AND APPROVALS CERTIFICATION', [['Prepared by','Payroll Officer'],['Reviewed by','HR Manager'],['Approved by','Authorized Approver']]],
    'Payslip': ['PAYSLIP ACKNOWLEDGEMENT', [['Prepared by','Payroll Officer'],['Approved by','Authorized Approver'],['Received by','Employee']]]
  };
  function signatureBlock(kind) {
    const [title, people] = SIGN_SETS[kind] || SIGN_SETS['Payroll'];
    return `<section class="tap-signatures"><div class="tap-signatures-title">${title}</div><div class="tap-signature-grid">${people.map(([who, role]) => `<div class="tap-signature"><div class="tap-signature-line"></div><strong>${who}</strong><span>${role}</span><small>Date: __________________</small></div>`).join('')}</div></section>`;
  }
  function printDocument(kind, code, start, end, html, opts = {}) {
    const prefix = `RPT-${code}-${(start || "ALL").replace(/-/g, "")}-${(end || "ALL").replace(/-/g, "")}`;
    const n = PMSStore.getReports().filter(r => r.controlNo.startsWith(prefix)).length + 1;
    const controlNo = `${prefix}-${String(n).padStart(3,"0")}`;
    PMSStore.saveReport({controlNo,kind,start,end,generatedAt:new Date().toISOString()});
    let area = document.getElementById('tapPrintReport');
    if (!area) { area=document.createElement('div');area.id='tapPrintReport';document.body.appendChild(area); }
    area.innerHTML = `<header><h2>TAP | ${esc(kind)} Report</h2><p>Control No: ${esc(controlNo)}<br>Period: ${esc(reportDate(start))} to ${esc(reportDate(end))}<br>Generated: ${new Date().toLocaleString()}</p></header>${html}${html.includes('tap-signatures') ? '' : signatureBlock(kind)}`;
    area.className = opts.landscape ? 'tap-wide' : '';
    document.body.classList.add('printing-tap-report');
    const cleanup=()=>{document.body.classList.remove('printing-tap-report');area.innerHTML='';window.removeEventListener('afterprint',cleanup);};
    window.addEventListener('afterprint',cleanup);
    window.print();
  }
  window.printDtrReport = () => {
    const start=val('dtrFrom'),end=val('dtrTo');
    const records=dtrFiltered().sort((a,b)=>a.date.localeCompare(b.date));
    const rowsHtml=records.map(r=>{const m=attendanceMetrics(r);return `<tr><td>${esc(r.date)}</td><td>${esc(r.empId)}</td><td>${esc(r.name)}</td>${punchCells(r).map(t=>`<td>${esc(t)}</td>`).join('')}<td>${m.late}</td><td>${hoursLabel(m.hours)}</td><td>${esc(m.status)}</td></tr>`;}).join('')||'<tr><td colspan="10">No records</td></tr>';
    printDocument('Attendance','ATT',start,end,`<p>Matching attendance records: ${records.length}</p><table><thead><tr><th>Date</th><th>Employee No.</th><th>Employee</th><th>AM In</th><th>AM Out</th><th>PM In</th><th>PM Out</th><th>Late (min)</th><th>Hours</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>`, { landscape: true });
  };
  // The on-screen payroll table stays short (one Deductions column). The printed report is the long, itemized one.
  window.printPayrollReport = () => {
    const start=val('payrollStart'),end=val('payrollEnd');
    const pq=(document.getElementById('payrollSearch')?.value||'').trim().toLowerCase();
    const emps=PMSStore.getEmployees().filter(e=>e.status==='Active' && (!pq || `${e.id} ${e.name}`.toLowerCase().includes(pq)));
    const keys=['basic','pay','ot','gross','late','leaveDed','sss','philhealth','pagibig','tax','loan','deductions','net'];
    const tot=Object.fromEntries(keys.map(k=>[k,0])); let legacy=0;
    const rows=emps.map(e=>{
      const p=payFor(e,start,end), old=p.sss===undefined; if(old) legacy++;
      const v={basic:p.basic,pay:p.gross,ot:p.otEarnings,gross:p.gross+p.otEarnings,late:p.late,leaveDed:p.leaveDed,sss:old?null:p.sss,philhealth:old?null:p.philhealth,pagibig:old?null:p.pagibig,tax:old?null:p.tax,loan:old?null:p.loan,deductions:p.deductions,net:p.net};
      keys.forEach(k=>tot[k]+=v[k]||0);
      const c=k=>`<td class="num">${v[k]===null?'-':money(v[k])}</td>`;
      return `<tr><td>${esc(e.id)}</td><td>${esc(e.name)}${old?' †':''}</td>${keys.map(c).join('')}</tr>`;
    }).join('')||`<tr><td colspan="${keys.length+2}">No employees</td></tr>`;
    const head=['Monthly Rate','Basic Pay','Overtime','Gross Pay','Late','Unpaid Leave','SSS','PhilHealth','Pag-IBIG','Withholding Tax','Loan','Total Deductions','Net Pay'];
    const signatories = `<section class="tap-signatures"><div class="tap-signatures-title">PAYROLL CERTIFICATION & APPROVAL</div><div class="tap-signature-grid"><div class="tap-signature"><div class="tap-signature-line"></div><strong>Prepared by</strong><span>Payroll Officer</span><small>Date: __________________</small></div><div class="tap-signature"><div class="tap-signature-line"></div><strong>Reviewed by</strong><span>HR Manager</span><small>Date: __________________</small></div><div class="tap-signature"><div class="tap-signature-line"></div><strong>Approved by</strong><span>Authorized Approver</span><small>Date: __________________</small></div></div></section>`;
    printDocument('Payroll','PAY',start,end,`<table class="tap-payroll-detail"><thead><tr><th>Employee No.</th><th>Name</th>${head.map(h=>`<th class="num">${h}</th>`).join('')}</tr><tr class="tap-group"><th colspan="2"></th><th colspan="4" class="num">Earnings</th><th colspan="8" class="num">Deductions</th><th class="num"></th></tr></thead><tbody>${rows}<tr class="tap-total"><th colspan="2">TOTAL</th>${keys.map(k=>`<th class="num">${money(tot[k])}</th>`).join('')}</tr></tbody></table>${legacy?`<p class="tap-note">† Released before deductions were itemized. Only the total is shown; see the employee's payslip for the grouped amounts.</p>`:''}${signatories}`, { landscape: true });
  };
  window.printApprovalsReport = () => {
    const start=val('apprFrom'),end=val('apprTo');
    const requests=requestsFiltered();
    const rows=requests.map(r=>`<tr><td>${esc(r.controlNo)}</td><td>${esc(r.empId)}</td><td>${esc(r.name)}</td><td>${esc(r.kind)}</td><td>${esc(r.status)}</td></tr>`).join('');
    printDocument('Requests and Approvals','APR',start,end,`<table><thead><tr><th>Request Control No.</th><th>Employee No.</th><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No requests</td></tr>'}</tbody></table>`);
  };
  ['dtrFrom','dtrTo','dtrStatus'].forEach(id => document.getElementById(id).addEventListener('change', () => { tablePages.set('masterDtrBody', 1); renderAdminDashboard(); }));
  document.getElementById('dtrReset')?.addEventListener('click', () => { tablePages.set('masterDtrBody', 1); ['dtrSearch','dtrStatus','dtrFrom','dtrTo'].forEach(id => document.getElementById(id).value = ''); renderAdminDashboard(); });
  document.getElementById('dtrSearch').addEventListener('input', () => { tablePages.set('masterDtrBody', 1); renderAdminDashboard(); });
  document.getElementById('payrollSearch').addEventListener('input', () => { tablePages.set('payrollSummaryBody', 1); renderAdminPayroll(); });
  ['payrollStart','payrollEnd','payrollStatus'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { tablePages.set('payrollSummaryBody', 1); renderAdminPayroll(); }));
  document.getElementById('apprSearch').addEventListener('input', () => { tablePages.set('adminRequestsBody', 1); renderApprovals(); });
  document.getElementById('apprStatus').addEventListener('change', () => { tablePages.set('adminRequestsBody', 1); renderApprovals(); });
  ['apprFrom','apprTo'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { tablePages.set('adminRequestsBody', 1); renderApprovals(); }));

  // Employee history + position range (read-only, from EMS)
  window.openHistory = function(empId) {
    const emp = PMSStore.getEmployees().find(e => e.id === empId); if (!emp) return;
    let m = document.getElementById("historyModal");
    if (!m) {
      m = document.createElement("div"); m.id = "historyModal"; m.className = "modal fade"; m.tabIndex = -1;
      m.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content border-0 shadow"><div class="modal-header bg-dark text-white"><h6 class="modal-title fw-bold" id="historyTitle"></h6><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body" id="historyBody"></div></div></div>`;
      document.body.appendChild(m);
    }
    const f = v => typeof v === "number" ? peso(v) : v;
    document.getElementById("historyTitle").innerText = `${emp.name} (${emp.id}) | Record History`;
    document.getElementById("historyBody").innerHTML = `
      <div class="employee-record-summary"><div><small>Position</small><strong>${esc(emp.role || '—')}</strong></div><div><small>Department</small><strong>${esc(emp.department || '—')}</strong></div><div><small>Status</small><strong>${esc(emp.status || '—')}</strong></div><div><small>Employment type</small><strong>${esc(emp.employmentType || '—')}</strong></div><div><small>Current salary rate</small><strong>${peso(emp.baseSalary)}</strong></div></div>
      <h6 class="fw-bold">Work schedule history</h6><div class="table-responsive mb-3"><table class="table table-sm align-middle small"><thead class="table-light"><tr><th>Date</th><th>Working hours</th></tr></thead><tbody>
      ${(emp.scheduleHistory || []).slice().sort((x,y) => String(y.effectiveDate).localeCompare(String(x.effectiveDate))).map(h => `<tr><td>${esc(h.effectiveDate || '—')}</td><td>${esc(h.scheduleStart || '—')}–${esc(h.scheduleEnd || '—')}</td></tr>`).join('') || `<tr><td colspan="2" class="text-center text-muted">No schedule history available.</td></tr>`}
      </tbody></table></div>
      <h6 class="fw-bold">Employment history</h6><table class="table table-sm align-middle small"><thead class="table-light"><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>By</th></tr></thead><tbody>
      ${EMS.getHistory(empId).map(h => `<tr><td>${h.date}</td><td>${h.field}</td><td class="text-muted">${f(h.from)}</td><td class="fw-semibold">${f(h.to)}</td><td>${h.by}</td></tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted">No history available.</td></tr>`}
      </tbody></table>`;
    new bootstrap.Modal(m).show();
  };

  function workDays(a, b) {
    if (!a || !b || b < a) return 0;
    let n = 0; for (let d = new Date(a + "T00:00"); d <= new Date(b + "T00:00"); d.setDate(d.getDate() + 1)) if (d.getDay() % 6) n++;
    return n;
  }
  const updDays = () => { document.getElementById("empLeaveDays").innerText = workDays($("#empLeaveDate").val(), $("#empLeaveEnd").val()); };
  $("#empLeaveDate").on("change", updDays);
  $("#empLeaveEnd").on("change", updDays);

  // Admin acts as approver for now (real approver = other group's system). Approving deducts the leave balance; extra days become unpaid.
  window.decideLeave = function(controlNo, decision) {
    const l = PMSStore.getLeaves().find(x => x.controlNo === controlNo);
    if (!l || l.status !== "Pending") return;
    l.status = decision;
    if (decision === "Approved") {
      const emp = PMSStore.getEmployees().find(e => e.id === l.empId);
      emp.leaveBalance = emp.leaveBalance || { "Vacation Leave": 10, "Sick Leave": 10, "Emergency Leave": 3 };
      const bal = emp.leaveBalance[l.type] || 0, days = l.days || 1;
      const paid = l.type === "Unpaid Leave" ? 0 : Math.min(days, bal);
      l.unpaidDays = days - paid;
      if (l.type !== "Unpaid Leave") emp.leaveBalance[l.type] = bal - paid;
      PMSStore.saveEmployee(emp);
      alert(`Approved. ${paid} day(s) deducted from the ${l.type} balance. ${l.unpaidDays} day(s) will be deducted in payroll.`);
    }
    PMSStore.updateLeave(l);
    renderAdminAppraisals(); renderAdminPayroll();
  };

  function renderEmpProfile() {
    if (!currentUser || currentUser.role !== 'employee') return;
    const emp = PMSStore.getEmployees().find(e => e.id === currentUser.empId);
    const root = document.getElementById('empProfileContent');
    if (!emp) { root.textContent = 'Employee record unavailable.'; return; }
    const field = (label,value) => `<div class="tap-profile-field"><small>${esc(label)}</small><strong>${esc(value || 'Not provided')}</strong></div>`;
    const history = (EMS.historySeed || []).filter(x => x.empId === emp.id).concat(PMSStore.getAppraisals().filter(x => x.empId === emp.id).map(x => ({date:x.effectiveDate,field:'Salary Appraisal',from:x.oldSalary,to:x.newSalary,by:x.remarks || 'HR'}))).sort((x,y) => String(y.date).localeCompare(String(x.date)));
    root.innerHTML = `<div class="tap-profile-grid">${field('Employee ID',emp.id)}${field('Full name',emp.name)}${field('Position',emp.role)}${field('Department',emp.department || '—')}${field('Employment status',emp.status)}${field('Current basic salary',peso(emp.baseSalary))}${field('RFID',emp.nfcTag ? 'Assigned' : 'Unassigned')}${field('Working hours',scheduleFor(emp,localToday()).scheduleStart+'–'+scheduleFor(emp,localToday()).scheduleEnd)}</div><hr><h6 class="fw-bold">Schedule history</h6><div class="table-responsive mb-3"><table class="table table-sm align-middle"><thead><tr><th>Date</th><th>Working hours</th></tr></thead><tbody id="empScheduleHistoryBody">${(emp.scheduleHistory||[]).slice().sort((a,b)=>String(b.effectiveDate).localeCompare(String(a.effectiveDate))).map(h=>`<tr><td>${esc(h.effectiveDate||'—')}</td><td>${esc(h.scheduleStart||'—')}–${esc(h.scheduleEnd||'—')}</td></tr>`).join('')||'<tr><td colspan="2" class="text-muted">No schedule history available</td></tr>'}</tbody></table></div><h6 class="fw-bold">Employment history</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Effective date</th><th>Change</th><th>Previous</th><th>Updated</th></tr></thead><tbody id="empEmploymentHistoryBody">${history.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.field)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">No history available</td></tr>'}</tbody></table></div>`;
    paginateTable('empScheduleHistoryBody');
    paginateTable('empEmploymentHistoryBody');
  }
  ['empDtrSearch','empDtrStatus','empDtrFrom','empDtrTo'].forEach(id => document.getElementById(id)?.addEventListener(id === 'empDtrSearch' ? 'input' : 'change', () => { tablePages.set('empPersonalDtrBody', 1); renderEmpDtr(); }));
  document.getElementById('empDtrReset')?.addEventListener('click',()=>{tablePages.set('empPersonalDtrBody',1);['empDtrSearch','empDtrStatus','empDtrFrom','empDtrTo'].forEach(id=>document.getElementById(id).value='');renderEmpDtr();});
  ['empReqSearch','empReqStatus'].forEach(id => document.getElementById(id)?.addEventListener(id === 'empReqSearch' ? 'input' : 'change', () => { tablePages.set('empRequestsBody', 1); renderEmpRequests(); }));
  document.getElementById('empReqReset')?.addEventListener('click', () => { tablePages.set('empRequestsBody', 1); document.getElementById('empReqSearch').value = ''; document.getElementById('empReqStatus').value = ''; renderEmpRequests(); });
  document.getElementById('empPayslipSearch')?.addEventListener('input', () => { tablePages.set('empPersonalPayslipsBody', 1); renderEmpPayslips(); });
  document.getElementById('empPayslipReset')?.addEventListener('click', () => { tablePages.set('empPersonalPayslipsBody', 1); document.getElementById('empPayslipSearch').value = ''; renderEmpPayslips(); });

  function renderEmpPayslips() {
    if (!currentUser || currentUser.role !== "employee") return;
    const tbody = document.getElementById("empPersonalPayslipsBody");
    const search = (document.getElementById('empPayslipSearch')?.value || '').trim().toLowerCase();
    const records = Object.entries(PMSStore.getPayrollRecords()).filter(([, r]) =>
      r.status === 'released' && r.snapshot && r.snapshot.empId === currentUser.empId
    ).sort((a,b) => b[1].snapshot.periodEnd.localeCompare(a[1].snapshot.periodEnd));
    const rows = records.filter(([,r]) => `${r.snapshot.periodStart} to ${r.snapshot.periodEnd}`.toLowerCase().includes(search));
    tbody.innerHTML = rows.map(([key,r]) => {
      const p = r.snapshot.pay, period = `${r.snapshot.periodStart} to ${r.snapshot.periodEnd}`;
      return `<tr><td class="ps-3 fw-semibold">${esc(period)}<div class="text-muted small">${p.sss === undefined ? `Gov/benefits: ${peso(p.gov)} · Tax/loan: ${peso(p.taxLoan)}` : `SSS: ${peso(p.sss)} · PhilHealth: ${peso(p.philhealth)} · Pag-IBIG: ${peso(p.pagibig)} · Tax: ${peso(p.tax)} · Loan: ${peso(p.loan)}`} · Late: ${peso(p.late)} · Leave: ${peso(p.leaveDed)}</div></td><td>${peso(p.gross + p.otEarnings)}</td><td class="text-danger">-${peso(p.deductions)}</td><td class="fw-bold text-success">${peso(p.net)}</td><td><button class="btn btn-sm btn-primary py-0" onclick="window.viewPayslipModal('${esc(currentUser.empId)}','${esc(r.snapshot.periodStart)}','${esc(r.snapshot.periodEnd)}')"><i class="bi bi-receipt"></i> View Payslip</button></td></tr>`;
    }).join('') || `<tr><td colspan="5" class="text-center text-muted py-3">No released payslips match your search.</td></tr>`;
    paginateTable('empPersonalPayslipsBody');
  }

  window.viewProofModal = function(empId, date) {
    const r = PMSStore.getDTR().find(x => x.empId === empId && x.date === date);
    if (!r) return;
    const times = punchCells(r);
    const firstImg = r.photoIn || ((r.photoOut || r.photoIn2 || r.photoOut2) ? "" : (r.photoProof || ""));
    // legacy record: its single in/out photos are AM In and PM Out
    const photos = isTwoSession(r) ? [firstImg, r.photoOut, r.photoIn2, r.photoOut2] : [firstImg, "", "", r.photoOut];
    // All four boxes are always shown, so a missing photo is visible instead of silently hidden
    const setImg = (imgId, boxId, src, emptyMsg) => {
      const img = document.getElementById(imgId), ph = document.querySelector("#" + boxId + " .proof-ph");
      const showMissing = msg => { img.classList.add("d-none"); ph.textContent = msg; ph.classList.remove("d-none"); };
      img.onerror = () => showMissing("Photo could not be loaded");
      if (src) { ph.classList.add("d-none"); img.classList.remove("d-none"); img.src = src; }
      else { img.removeAttribute("src"); showMissing(emptyMsg); }
    };
    [["proofModalImgIn", "proofBoxIn"], ["proofModalImgOut", "proofBoxOut"], ["proofModalImgIn2", "proofBoxIn2"], ["proofModalImgOut2", "proofBoxOut2"]].forEach(([img, box], i) =>
      setImg(img, box, photos[i], times[i] === "--" ? "Not punched" : "No photo saved"));
    document.getElementById("proofModalName").innerText = r.name;
    document.getElementById("proofModalTime").innerText = `${r.date}  |  AM ${times[0]} - ${times[1]}  |  PM ${times[2]} - ${times[3]}`;
    new bootstrap.Modal(document.getElementById("proofModal")).show();
  };

  // Print only the payslip. The page-wide print CSS hides everything except the payroll report,
  // so the modal printed blank. We copy the slip into #payslipPrintArea and print just that.
  window.printPayslip = function() {
    const src = document.getElementById("payslipBody"); if (!src) return;
    let area = document.getElementById("payslipPrintArea");
    if (!area) { area = document.createElement("div"); area.id = "payslipPrintArea"; document.body.appendChild(area); }
    const ps = val('payrollStart'), pe = val('payrollEnd');
    const pfx = `RPT-PSL-${ps.replace(/-/g, '')}-${pe.replace(/-/g, '')}`;
    const pno = `${pfx}-${String(PMSStore.getReports().filter(r => r.controlNo.startsWith(pfx)).length + 1).padStart(3, '0')}`;
    PMSStore.saveReport({ controlNo: pno, kind: 'Payslip', start: ps, end: pe, generatedAt: new Date().toISOString() });
    area.innerHTML = `<header class="tap-ps-head"><h2>TAP | Payslip</h2><p>Control No: ${esc(pno)}<br>Period: ${esc(reportDate(ps))} to ${esc(reportDate(pe))}<br>Generated: ${new Date().toLocaleString()}</p></header>${src.innerHTML}${signatureBlock('Payslip')}`;
    document.body.classList.add("printing-payslip");
    const done = () => { document.body.classList.remove("printing-payslip"); area.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };

  window.viewPayslipModal = function(empId, start = $("#payrollStart").val(), end = $("#payrollEnd").val()) {
    const employees = PMSStore.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById("psEmpId").innerText = emp.id;
    document.getElementById("psEmpName").innerText = emp.name;
    document.getElementById("psEmpRole").innerText = emp.role;
    const record = PMSStore.getPayrollRecord(releaseKey(empId, start, end));
    if (currentUser?.role === "employee" && (currentUser.empId !== empId || record?.status !== "released")) return;
    const P = record?.status === "released" && record.snapshot ? record.snapshot.pay : calcPay(emp, start, end);
    const set = (id, v) => { document.getElementById(id).innerText = v; };
    set("psPeriod", `${start} to ${end}`);
    set("psEmpBase", peso(P.basic || emp.baseSalary)); set("psGross", peso(P.gross)); set("psOt", "+" + peso(P.otEarnings));
    set("psLate", "-" + peso(P.late)); set("psUndertime", "-" + peso(P.undertime || 0)); set("psLeave", "-" + peso(P.leaveDed));
    // Itemized deductions. A slip released before the itemized version only has grouped totals, so show those instead.
    const itemized = P.sss !== undefined;
    document.querySelectorAll("#payslipBody .ps-item").forEach(el => el.classList.toggle("d-none", !itemized));
    document.querySelectorAll("#payslipBody .ps-legacy").forEach(el => el.classList.toggle("d-none", itemized));
    if (itemized) { set("psSss", "-" + peso(P.sss)); set("psPhil", "-" + peso(P.philhealth)); set("psPagibig", "-" + peso(P.pagibig)); set("psWtax", "-" + peso(P.tax)); set("psLoan", "-" + peso(P.loan)); }
    else { set("psGov", "-" + peso(P.gov)); set("psTax", "-" + peso(P.taxLoan)); }
    set("psTotalDed", "-" + peso(P.deductions)); set("psNet", peso(P.net));

    new bootstrap.Modal(document.getElementById("payslipModal")).show();
  };

  // LIVE POLLING: pulls updates from /api/v1/sync every 1.5s
  setInterval(() => {
    PMSStore.pullFromServer(() => {
      if (currentUser && currentUser.role === "admin") {
        renderAdminDashboard();
        renderAdminPayroll();
        renderAdminWorkforce();
        renderAdminAppraisals(); renderApprovals();
      } else if (currentUser && currentUser.role === "employee") {
        renderEmpDtr();
        renderEmpPayslips(); renderEmpRequests(); renderEmpLeaveRequests();
      }
    });
  }, 1500);

  applyAuthSession();
});