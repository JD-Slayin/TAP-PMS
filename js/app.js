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
      "admin-workforce": "Workforce and RFID Card Assignment",
      "admin-payroll": "Payroll Processing and Master Report",
      "admin-appraisals": "Salary Appraisals and Leave Records",
      "emp-dtr": "My Attendance Record",
      "emp-leave": "File a Leave Request",
      "emp-payslips": "My Payslips",
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
    if (viewName === "admin-approvals") renderApprovals();
    if (viewName === "emp-requests") renderEmpRequests();
  }

  $("[data-view]").on("click", function (e) {
    e.preventDefault();
    switchView($(this).attr("data-view"));
  });

  function renderAdminDashboard() {
    const employees = PMSStore.getEmployees();
    const dtr = PMSStore.getDTR();
    const leaves = PMSStore.getLeaves();

    document.getElementById("statEmployees").innerText = employees.length;
    document.getElementById("statPresent").innerText = new Set(dtr.map(r => r.empId)).size;
    document.getElementById("statLeaves").innerText = leaves.length;
    renderRail(employees, dtr);

    const tbody = document.getElementById("masterDtrBody");
    tbody.innerHTML = "";
    const dF = $("#dtrFrom").val(), dT = $("#dtrTo").val();
    dtr.filter(r => (!dF || r.date >= dF) && (!dT || r.date <= dT)).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3">${r.date}</td>
        <td><span class="badge bg-secondary-subtle text-dark font-monospace">${r.empId}</span></td>
        <td class="fw-semibold">${r.name}</td>
        <td class="text-success fw-bold">${r.timeIn}</td>
        <td class="text-danger fw-bold">${r.timeOut}</td>
        <td>${r.lateMinutes > 0 ? `<span class="badge bg-danger">${r.lateMinutes}m</span>` : '0'}</td>
        <td>${r.renderedHours} hrs</td>
        <td><span class="badge ${r.status.includes('Late') ? 'bg-danger' : 'bg-success'}">${r.status}</span></td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline-primary py-0" onclick="window.viewProofModal('${r.empId}', '${r.date}')">
            <i class="bi bi-eye"></i> View
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderRail(employees, dtr) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    const sD = $("#payrollStart").val(), eD = $("#payrollEnd").val();
    const active = employees.filter(e => e.status === "Active");
    let gross = 0, ded = 0, net = 0;
    active.forEach(e => { const P = calcPay(e, sD, eD); gross += P.gross + P.otEarnings; ded += P.deductions; net += P.net; });
    const released = PMSStore.getReleasedPayslips();
    set("railReq", PMSStore.getRequests().filter(q => q.status === "Pending").length);
    set("railLeave", PMSStore.getLeaves().filter(l => l.status === "Pending").length);
    set("railRelease", active.filter(e => !released.includes(e.id)).length);
    set("railPeriod", `${sD} to ${eD}`);
    set("railGross", peso(gross)); set("railDed", "-" + peso(ded)); set("railNet", peso(net));
    set("statPayroll", peso(net));
    set("railRecords", dtr.length); set("railLate", dtr.filter(r => (r.lateMinutes || 0) > 0).length);
  }

  function renderEmpSummary() {
    const box = document.getElementById("empSummary");
    if (!box || !currentUser || currentUser.role !== "employee") return;
    const emp = PMSStore.getEmployees().find(e => e.id === currentUser.empId); if (!emp) return;
    const bal = emp.leaveBalance || { "Vacation Leave": 10, "Sick Leave": 10, "Emergency Leave": 3 };
    const mine = PMSStore.getDTR().filter(r => r.empId === emp.id);
    const late = mine.reduce((x, r) => x + (r.lateMinutes || 0), 0);
    const cell = (l, v, c) => `<div class="kpi ${c || ""}"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`;
    box.innerHTML = cell("Employee", `<span class="fs-6">${emp.name}</span><div class="kpi-sub">${emp.id} &middot; ${emp.role}</div>`, "kpi-accent") +
      cell("Vacation Leave", (bal["Vacation Leave"] ?? 0) + " days") + cell("Sick Leave", (bal["Sick Leave"] ?? 0) + " days") +
      cell("Emergency Leave", (bal["Emergency Leave"] ?? 0) + " days") + cell("Total Late", late + " mins");
  }
  document.getElementById("todayLabel").innerText = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  function renderAdminWorkforce() {
    const employees = PMSStore.getEmployees();
    const tbody = document.getElementById("workforceTableBody");
    tbody.innerHTML = "";

    employees.forEach(emp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 font-monospace fw-bold text-primary">${emp.id}</td>
        <td class="fw-semibold">${emp.name}</td>
        <td>${emp.role}</td>
        <td>
          <span class="badge badge-soft-${emp.status === 'Active' ? 'success' : (emp.status === 'Retired' ? 'warning' : 'danger')}">
            ${emp.status}
          </span>
        </td>
        <td>
          <span class="badge bg-dark font-monospace px-2 py-1">${emp.nfcTag || 'NO CARD ASSIGNED'}</span>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="window.openEditRfidModal('${emp.id}')">
            <i class="bi bi-pencil-square me-1"></i> Edit RFID
          </button>
          <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" onclick="window.openHistory('${emp.id}')"><i class="bi bi-clock-history me-1"></i> History</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.openEditRfidModal = function(empId) {
    const employees = PMSStore.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById("editEmpId").value = emp.id;
    document.getElementById("editEmpName").innerText = emp.name;
    document.getElementById("editEmpSub").innerText = `${emp.id} | ${emp.role}`;
    document.getElementById("editEmpAvatar").innerText = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('');
    document.getElementById("editRfidTagInput").value = emp.nfcTag || '';

    const modal = new bootstrap.Modal(document.getElementById("rfidAssignModal"));
    modal.show();
  };

  $("#formAssignRfid").on("submit", (e) => {
    e.preventDefault();
    const empId = $("#editEmpId").val();
    const newTag = $("#editRfidTagInput").val().trim();

    if (!newTag) {
      alert("Please enter an RFID card tag.");
      return;
    }

    const employees = PMSStore.getEmployees();
    const duplicate = employees.find(emp => emp.id !== empId && emp.nfcTag.toLowerCase() === newTag.toLowerCase());
    if (duplicate) {
      alert(`ERROR: This RFID tag is already assigned to ${duplicate.name} (${duplicate.id}).`);
      return;
    }

    const success = PMSStore.updateEmployeeRfid(empId, newTag);
    if (success) {
      alert(`RFID card [${newTag}] was successfully assigned to ${document.getElementById("editEmpName").innerText}.`);
      bootstrap.Modal.getInstance(document.getElementById("rfidAssignModal")).hide();
      renderAdminWorkforce();
    }
  });

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

    employees.forEach(emp => {
      if (emp.status === "Terminated") return;

      const { basic, gross, otEarnings, deductions, net } = calcPay(emp, sDate, eDate);

      grandBasic += basic;
      grandGross += gross;
      grandOt += otEarnings;
      grandDeductions += deductions;
      grandNet += net;

      const isReleased = released.includes(emp.id);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center font-monospace">${emp.id}</td>
        <td class="fw-bold">${emp.name}</td>
        <td class="text-center"><span class="badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${emp.status}</span></td>
        <td class="text-end">₱${basic.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td class="text-end no-print">₱${gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td class="text-end text-success no-print">+₱${otEarnings.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td class="text-end text-danger">-₱${deductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td class="text-end fw-bold fs-6">₱${net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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

    document.getElementById("grandBasic").innerText = `₱${grandBasic.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("grandGross").innerText = `₱${grandGross.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("grandOt").innerText = `₱${grandOt.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("grandDeductions").innerText = `-₱${grandDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("grandNet").innerText = `₱${grandNet.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("statPayroll").innerText = `₱${grandNet.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  }

  $("#btnFilterPayroll").on("click", renderAdminPayroll);

  $("#btnReleaseAll").on("click", () => {
    const employees = PMSStore.getEmployees();
    const released = employees.filter(e => e.status === "Active").map(e => e.id);
    PMSStore.saveReleasedPayslips(released);
    renderAdminPayroll();
    alert("Payslips have been released to all active employees.");
  });

  window.toggleRelease = function(empId) {
    let released = PMSStore.getReleasedPayslips();
    if (released.includes(empId)) {
      released = released.filter(id => id !== empId);
      alert(`The payslip release for ${empId} has been withdrawn.`);
    } else {
      released.push(empId);
      alert(`The payslip for ${empId} has been released.`);
    }
    PMSStore.saveReleasedPayslips(released);
    renderAdminPayroll();
  };

  function renderAdminAppraisals() {
    const appraisals = PMSStore.getAppraisals();
    const aTbody = document.getElementById("appraisalTableBody");
    aTbody.innerHTML = "";
    appraisals.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 fw-bold">${a.name}</td>
        <td class="text-muted text-decoration-line-through">₱${a.oldSalary.toLocaleString()}</td>
        <td class="text-success fw-bold">₱${a.newSalary.toLocaleString()}</td>
        <td>${a.effectiveDate}</td>
        <td><span class="badge bg-light text-dark">${a.remarks}</span></td>
      `;
      aTbody.appendChild(tr);
    });

    const leaves = PMSStore.getLeaves();
    const lTbody = document.getElementById("adminLeavesBody");
    lTbody.innerHTML = "";
    leaves.forEach(l => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3 font-monospace fw-bold text-primary">${l.controlNo}</td>
        <td>${l.name}</td>
        <td>${esc(l.type)}${l.reason ? `<div class="text-muted leave-reason">${esc(l.reason)}</div>` : ""}</td>
        <td>${l.date}${l.endDate && l.endDate !== l.date ? " to " + l.endDate : ""} (${l.days || 1}d)</td>
        <td>${l.proofPath ? `<a class="proof-link" href="${esc(l.proofPath)}" target="_blank" rel="noopener"><i class="bi bi-paperclip"></i>${esc(l.proofName || "View")}</a>` : `<span class="text-muted">None</span>`}</td>
        <td><span class="badge bg-${l.status === "Approved" ? "success" : l.status === "Pending" ? "warning text-dark" : "danger"}">${l.status}</span>
          ${l.status === "Pending" ? `<div class="row-actions"><button class="btn btn-sm btn-success" onclick="window.decideLeave('${l.controlNo}','Approved')">Approve</button><button class="btn btn-sm btn-outline-danger" onclick="window.decideLeave('${l.controlNo}','Rejected')">Reject</button></div>` : ""}</td>
      `;
      lTbody.appendChild(tr);
    });
  }

  function renderEmpDtr() {
    if (!currentUser || currentUser.role !== "employee") return;
    renderEmpSummary();
    const dtr = PMSStore.getDTR();
    const myLogs = dtr.filter(r => r.empId === currentUser.empId);
    const tbody = document.getElementById("empPersonalDtrBody");
    tbody.innerHTML = "";

    myLogs.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="ps-3">${r.date}</td>
        <td class="text-success fw-bold">${r.timeIn}</td>
        <td class="text-danger fw-bold">${r.timeOut}</td>
        <td>${r.lateMinutes} mins</td>
        <td>${r.renderedHours} hrs</td>
        <td><span class="badge bg-success">${r.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary py-0" onclick="window.viewProofModal('${r.empId}', '${r.date}')">
            <i class="bi bi-eye"></i> View
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  async function uploadLeaveFile(file, ctrlNo) {
    const fd = new FormData(); fd.append("file", file); fd.append("controlNo", ctrlNo);
    try { const r = await fetch("upload_leave.php", { method: "POST", body: fd }); const t = await r.text(); const res = JSON.parse(t); return res.ok ? { path: res.path } : { error: res.error }; }
    catch (err) { return { error: "cannot reach the server" }; }
  }

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
  });

  const reqDetail = q => q.kind === "Overtime" ? `${q.date} | ${q.hours}h OT` : q.kind === "Schedule Change" ? `${q.date} | ${q.schedType}: ${q.schedDays}` : `${q.date} | IN ${q.timeIn} OUT ${q.timeOut}`;
  const stBadge = s => `<span class="badge bg-${s === "Approved" ? "success" : s === "Pending" ? "warning text-dark" : "danger"}">${s}</span>`;
  function renderEmpRequests() {
    if (!currentUser || currentUser.role !== "employee") return;
    document.getElementById("empRequestsBody").innerHTML = PMSStore.getRequests().filter(q => q.empId === currentUser.empId).map(q =>
      `<tr><td class="ps-3 font-monospace">${q.controlNo}</td><td>${q.kind}</td><td>${reqDetail(q)}<div class="text-muted">${q.reason}</div></td><td>${stBadge(q.status)}</td></tr>`).join("") || `<tr><td colspan="4" class="text-center text-muted py-3">No requests filed yet.</td></tr>`;
  }
  function renderApprovals() {
    const f = $("#apprFrom").val(), t = $("#apprTo").val();
    document.getElementById("adminRequestsBody").innerHTML = PMSStore.getRequests().filter(q => (!f || q.date >= f) && (!t || q.date <= t)).map(q =>
      `<tr><td class="ps-3 font-monospace">${q.controlNo}</td><td>${q.name}<div class="text-muted">${q.empId}</div></td><td>${q.kind}</td><td>${reqDetail(q)}<div class="text-muted">${q.reason}</div></td>
      <td>${stBadge(q.status)}${q.status === "Pending" ? `<div class="row-actions no-print"><button class="btn btn-sm btn-success" onclick="window.decideRequest('${q.controlNo}','Approved')">Approve</button><button class="btn btn-sm btn-outline-danger" onclick="window.decideRequest('${q.controlNo}','Rejected')">Reject</button></div>` : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted py-3">No requests found.</td></tr>`;
  }
  ["apprFrom", "apprTo"].forEach(id => document.getElementById(id).addEventListener("change", renderApprovals));
  const to12 = hm => { let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + ap; };
  $("#reqKind").on("change", () => {
    const k = $("#reqKind").val();
    $("#reqHours").toggleClass("d-none", k !== "Overtime");
    $("#reqSched").toggleClass("d-none", k !== "Schedule Change");
    $("#reqManual").toggleClass("d-none", k !== "Manual Attendance");
  });
  $("#formRequest").on("submit", e => {
    e.preventDefault();
    const k = $("#reqKind").val();
    const q = { controlNo: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`, kind: k, empId: currentUser.empId, name: currentUser.name, date: $("#reqDate").val(), reason: $("#reqReason").val(), status: "Pending" };
    if (k === "Overtime") { q.hours = $("#reqHours").val(); if (!(Number(q.hours) > 0)) { alert("Enter the overtime hours."); return; } }
    if (k === "Schedule Change") { q.schedType = $("#reqSchedType").val(); q.schedDays = $("#reqSchedDays").val(); if (!q.schedDays) { alert("Enter the schedule days."); return; } }
    if (k === "Manual Attendance") { q.timeIn = $("#reqIn").val(); q.timeOut = $("#reqOut").val(); if (!q.timeIn || !q.timeOut || q.timeOut <= q.timeIn) { alert("Enter a valid time in and time out."); return; } }
    PMSStore.saveRequest(q);
    alert(`Request submitted. Control No.: ${q.controlNo}`);
    e.target.reset(); document.getElementById("reqKind").dispatchEvent(new Event("change")); renderEmpRequests();
  });
  window.decideRequest = function(controlNo, decision) {
    const q = PMSStore.getRequests().find(x => x.controlNo === controlNo);
    if (!q || q.status !== "Pending") return;
    if (decision === "Approved" && q.kind === "Manual Attendance") {
      if (PMSStore.getDTR().some(r => r.empId === q.empId && r.date === q.date)) { alert("An attendance record already exists for that date."); return; }
      const [ih, im] = q.timeIn.split(":").map(Number), [oh, om] = q.timeOut.split(":").map(Number);
      const late = ih > 8 || (ih === 8 && im > 15) ? (ih - 8) * 60 + im : 0;
      const hrs = Math.max(0, parseFloat(((oh * 60 + om - ih * 60 - im) / 60 - 1).toFixed(1)));
      PMSStore.saveDTRRecord({ date: q.date, empId: q.empId, name: q.name, timeIn: to12(q.timeIn), timeOut: to12(q.timeOut), lateMinutes: late, renderedHours: hrs, overtimeHours: 0, status: "Manual (Approved)", photoIn: null, photoOut: null, photoProof: (PMSStore.getEmployees().find(x => x.id === q.empId) || {}).photoUrl });
    }
    q.status = decision; PMSStore.saveRequest(q); renderApprovals();
  };

  const peso = n => "₱" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });
  // ONE computation used by the payroll table, payslip modal and employee payslip list
  function calcPay(emp, sDate, eDate) {
    const z = { basic: 0, gross: 0, otEarnings: 0, deductions: 0, net: 0, late: 0, gov: 0, taxLoan: 0, leaveDed: 0 };
    if (emp.status === "Retired" || emp.status === "Terminated") return z;
    const sal = EMS.salaryOn(emp, eDate), hr = sal / 26 / 8;
    const inRange = d => d >= sDate && d <= eDate;
    const lateMin = PMSStore.getDTR().filter(r => r.empId === emp.id && inRange(r.date)).reduce((x, r) => x + (r.lateMinutes || 0), 0);
    const otHrs = PMSStore.getRequests().filter(q => q.kind === "Overtime" && q.status === "Approved" && q.empId === emp.id && inRange(q.date)).reduce((x, q) => x + Number(q.hours || 0), 0);
    const unpaid = PMSStore.getLeaves().filter(l => l.empId === emp.id && l.status === "Approved" && inRange(l.startDate || l.date)).reduce((x, l) => x + (l.unpaidDays || 0), 0);
    const late = lateMin * (hr / 60), ot = otHrs * hr * 1.25, leaveDed = unpaid * (sal / 26), gov = 1250, taxLoan = 500;
    const deductions = late + gov + taxLoan + leaveDed, gross = sal / 2;
    return { basic: sal, gross, otEarnings: ot, deductions, net: gross + ot - deductions, late, gov, taxLoan, leaveDed };
  }

  // Report control number, saved so it is unique and traceable: RPT-PAY-<start>-<end>-<seq>
  window.printReport = function(kind, code, s, e, ctrlId) {
    const prefix = `RPT-${code}-${(s || "ALL").replace(/-/g, "")}-${(e || "ALL").replace(/-/g, "")}`;
    const n = PMSStore.getReports().filter(r => r.controlNo.startsWith(prefix)).length + 1;
    const controlNo = `${prefix}-${String(n).padStart(3, "0")}`;
    PMSStore.saveReport({ controlNo, kind, start: s, end: e, generatedAt: new Date().toISOString() });
    document.getElementById(ctrlId).innerText = controlNo;
    window.print();
  };
  const val = id => document.getElementById(id).value;
  window.printPayrollReport = () => window.printReport("Payroll", "PAY", val("payrollStart"), val("payrollEnd"), "reportCtrl");
  window.printDtrReport = () => window.printReport("Attendance", "ATT", val("dtrFrom"), val("dtrTo"), "dtrCtrl");
  window.printApprovalsReport = () => window.printReport("Approvals", "APR", val("apprFrom"), val("apprTo"), "apprCtrl");
  ["dtrFrom", "dtrTo"].forEach(id => document.getElementById(id).addEventListener("change", renderAdminDashboard));

  // Employee history + position range (read-only, from EMS)
  window.openHistory = function(empId) {
    const emp = PMSStore.getEmployees().find(e => e.id === empId); if (!emp) return;
    let m = document.getElementById("historyModal");
    if (!m) {
      m = document.createElement("div"); m.id = "historyModal"; m.className = "modal fade"; m.tabIndex = -1;
      m.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content border-0 shadow"><div class="modal-header bg-dark text-white"><h6 class="modal-title fw-bold" id="historyTitle"></h6><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body" id="historyBody"></div></div></div>`;
      document.body.appendChild(m);
    }
    const info = EMS.positionInfo(emp), f = v => typeof v === "number" ? peso(v) : v;
    document.getElementById("historyTitle").innerText = `${emp.name} (${emp.id}) | Record History`;
    document.getElementById("historyBody").innerHTML = `
      <div class="alert alert-light border small">Position: <strong>${emp.role}</strong> | Status: <strong>${emp.status}</strong> | Current salary: <strong>${peso(emp.baseSalary)}</strong>
      ${info ? `<br>Position range: ${peso(info.min)} - ${peso(info.max)} | Fixed rate: ${peso(info.fixed)} | <span class="badge bg-${info.within ? "success" : "danger"}">${info.within ? "Within range" : "OUT OF RANGE"}</span> <span class="badge bg-${info.isFixed ? "primary" : "secondary"}">${info.isFixed ? "Fixed rate" : "Approved custom rate"}</span>` : ""}</div>
      <table class="table table-sm align-middle small"><thead class="table-light"><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>By</th></tr></thead><tbody>
      ${EMS.getHistory(empId).map(h => `<tr><td>${h.date}</td><td>${h.field}</td><td class="text-muted">${f(h.from)}</td><td class="fw-semibold">${f(h.to)}</td><td>${h.by}</td></tr>`).join("") || `<tr><td colspan="5" class="text-center text-muted">No history available.</td></tr>`}
      </tbody></table><div class="text-muted small">Source: EMS (mock). Read-only in PMS.</div>`;
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

  function renderEmpPayslips() {
    if (!currentUser || currentUser.role !== "employee") return;
    const released = PMSStore.getReleasedPayslips();
    const tbody = document.getElementById("empPersonalPayslipsBody");
    tbody.innerHTML = "";

    if (released.includes(currentUser.empId)) {
      const employees = PMSStore.getEmployees();
      const emp = employees.find(e => e.id === currentUser.empId);
      const P = calcPay(emp, $("#payrollStart").val(), $("#payrollEnd").val());
      const gross = P.gross, deductions = P.deductions, net = P.net;

      tbody.innerHTML = `
        <tr>
          <td class="ps-3 fw-semibold">October 01 - 15, 2026</td>
          <td>₱${gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-danger">-₱${deductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="fw-bold text-success">₱${net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td>
            <button class="btn btn-sm btn-primary py-0" onclick="window.viewPayslipModal('${emp.id}')">
              <i class="bi bi-receipt"></i> View Payslip
            </button>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No payslip has been released to you for this cut-off yet.</td></tr>`;
    }
  }

  window.viewProofModal = function(empId, date) {
    const r = PMSStore.getDTR().find(x => x.empId === empId && x.date === date);
    if (!r) return;
    const timedOut = r.timeOut && r.timeOut !== "--";
    const inImg = r.photoIn || (r.photoOut ? "" : (r.photoProof || ""));
    // In and Out boxes are always shown, so a missing photo is visible instead of silently hidden
    const setImg = (imgId, boxId, src, emptyMsg) => {
      const img = document.getElementById(imgId), ph = document.querySelector("#" + boxId + " .proof-ph");
      const showMissing = msg => { img.classList.add("d-none"); ph.textContent = msg; ph.classList.remove("d-none"); };
      img.onerror = () => showMissing("Photo could not be loaded");
      if (src) { ph.classList.add("d-none"); img.classList.remove("d-none"); img.src = src; }
      else { img.removeAttribute("src"); showMissing(emptyMsg); }
    };
    setImg("proofModalImgIn", "proofBoxIn", inImg, "No time-in photo saved");
    setImg("proofModalImgOut", "proofBoxOut", r.photoOut, timedOut ? "No time-out photo saved" : "Not timed out yet");
    document.getElementById("proofModalName").innerText = r.name;
    document.getElementById("proofModalTime").innerText = `${r.date}  IN ${r.timeIn}` + (timedOut ? `  |  OUT ${r.timeOut}` : "");
    new bootstrap.Modal(document.getElementById("proofModal")).show();
  };

  // Print only the payslip. The page-wide print CSS hides everything except the payroll report,
  // so the modal printed blank. We copy the slip into #payslipPrintArea and print just that.
  window.printPayslip = function() {
    const src = document.getElementById("payslipBody"); if (!src) return;
    let area = document.getElementById("payslipPrintArea");
    if (!area) { area = document.createElement("div"); area.id = "payslipPrintArea"; document.body.appendChild(area); }
    area.innerHTML = src.innerHTML;
    document.body.classList.add("printing-payslip");
    const done = () => { document.body.classList.remove("printing-payslip"); area.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };

  window.viewPayslipModal = function(empId) {
    const employees = PMSStore.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    document.getElementById("psEmpId").innerText = emp.id;
    document.getElementById("psEmpName").innerText = emp.name;
    document.getElementById("psEmpRole").innerText = emp.role;
    const P = calcPay(emp, $("#payrollStart").val(), $("#payrollEnd").val());
    const set = (id, v) => { document.getElementById(id).innerText = v; };
    set("psEmpBase", peso(P.basic || emp.baseSalary)); set("psGross", peso(P.gross)); set("psOt", "+" + peso(P.otEarnings));
    set("psLate", "-" + peso(P.late)); set("psGov", "-" + peso(P.gov)); set("psTax", "-" + peso(P.taxLoan));
    set("psLeave", "-" + peso(P.leaveDed)); set("psNet", peso(P.net));

    new bootstrap.Modal(document.getElementById("payslipModal")).show();
  };

  // LIVE POLLING: pulls updates from sync.php every 1.5s
  setInterval(() => {
    PMSStore.pullFromServer(() => {
      if (currentUser && currentUser.role === "admin") {
        renderAdminDashboard();
        renderAdminPayroll();
        renderAdminWorkforce();
        renderAdminAppraisals(); renderApprovals();
      } else if (currentUser && currentUser.role === "employee") {
        renderEmpDtr();
        renderEmpPayslips(); renderEmpRequests();
      }
    });
  }, 1500);

  applyAuthSession();
});