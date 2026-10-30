// tap-pms-ui/js/store.js

const PMSStore = {
  KEYS: {
    AUTH_USER: 'PMS_AUTH_USER',
    EMPLOYEES: 'PMS_EMPLOYEES',
    DTR: 'PMS_DTR',
    LEAVES: 'PMS_LEAVES',
    APPRAISALS: 'PMS_APPRAISALS',
    RELEASED_PAYSLIPS: 'PMS_RELEASED_PAYSLIPS',
    PAYROLL_RECORDS: 'PMS_PAYROLL_RECORDS',
    REQUESTS: 'PMS_REQUESTS',
    REPORTS: 'PMS_REPORTS',
    DELETED: 'PMS_DELETED_DTR'
  },

  seedEmployees: [
    {
      id: "EMP-001",
      nfcTag: "04930601A10F13",
      username: "EMP-001",
      password: "emp123",
      name: "Juan Dela Cruz",
      role: "Software Engineer",
      department: "IT", employmentType: "Regular", sourceSystem: "HR Demo Feed", hrEmployeeNo: "HR-1001",
      shiftName: "Regular Shift", scheduleStart: "08:00", scheduleEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, scheduleHistory: [{ effectiveDate: "2026-01-01", shiftName: "Regular Shift", scheduleStart: "08:00", scheduleEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, sourceSystem: "HR Demo Feed" }],
      status: "Active",
      baseSalary: 35000,
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "EMP-002",
      nfcTag: "NFC-102",
      username: "EMP-002",
      password: "emp123",
      name: "Maria Santos",
      role: "UI/UX Designer",
      department: "Product Design", employmentType: "Regular", sourceSystem: "HR Demo Feed", hrEmployeeNo: "HR-1002",
      shiftName: "Early Shift", scheduleStart: "07:00", scheduleEnd: "16:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, scheduleHistory: [{ effectiveDate: "2026-01-01", shiftName: "Early Shift", scheduleStart: "07:00", scheduleEnd: "16:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, sourceSystem: "HR Demo Feed" }],
      status: "Active",
      baseSalary: 42000,
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "EMP-003",
      nfcTag: "NFC-103",
      username: "EMP-003",
      password: "emp123",
      name: "Danilo Lim",
      role: "Senior Consultant",
      department: "Consulting", employmentType: "Regular", sourceSystem: "HR Demo Feed", hrEmployeeNo: "HR-1003",
      shiftName: "Late Shift", scheduleStart: "09:00", scheduleEnd: "18:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, scheduleHistory: [{ effectiveDate: "2026-01-01", shiftName: "Late Shift", scheduleStart: "09:00", scheduleEnd: "18:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, sourceSystem: "HR Demo Feed" }],
      status: "Retired",
      baseSalary: 55000,
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "EMP-004",
      nfcTag: "NFC-104",
      username: "EMP-004",
      password: "emp123",
      name: "Peter Cruz",
      role: "Former QA",
      department: "Quality Assurance", employmentType: "Regular", sourceSystem: "HR Demo Feed", hrEmployeeNo: "HR-1004",
      shiftName: "Regular Shift", scheduleStart: "08:00", scheduleEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, scheduleHistory: [{ effectiveDate: "2026-01-01", shiftName: "Regular Shift", scheduleStart: "08:00", scheduleEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, sourceSystem: "HR Demo Feed" }],
      status: "Terminated",
      baseSalary: 28000,
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "EMP-005",
      nfcTag: "NFC-105",
      username: "EMP-005",
      password: "emp123",
      name: "Angela Reyes",
      role: "Payroll Analyst",
      department: "Finance",
      employmentType: "Regular",
      sourceSystem: "HR Demo Feed",
      hrEmployeeNo: "HR-1005",
      shiftName: "Late Shift",
      scheduleStart: "09:00",
      scheduleEnd: "18:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      graceMinutes: 15,
      scheduleHistory: [{ effectiveDate: "2026-01-01", shiftName: "Late Shift", scheduleStart: "09:00", scheduleEnd: "18:00", lunchStart: "12:00", lunchEnd: "13:00", graceMinutes: 15, sourceSystem: "HR Demo Feed" }],
      status: "Active",
      baseSalary: 32000,
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
    }
  ],

  seedAppraisals: [
    {
      id: "APP-2026-001",
      empId: "EMP-002",
      name: "Maria Santos",
      oldSalary: 35000,
      newSalary: 42000,
      effectiveDate: "2026-10-01",
      remarks: "Promoted to Senior UI/UX Specialist"
    }
  ],

  seedLeaves: [
    {
      controlNo: "REQ-2026-0081",
      empId: "EMP-001",
      name: "Juan Dela Cruz",
      type: "Sick Leave",
      date: "2026-10-08",
      status: "Approved",
      proofAttached: true
    }
  ],

  // Demo attendance records from the simulated HR/attendance feed. These let payroll test complete,
  // late, incomplete, and PM-only attendance before the real HR integration is connected.
  seedDtr: [
    { empId: "EMP-001", name: "Juan Dela Cruz", date: "2026-10-01", timeIn: "8:00 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "5:00 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" },
    { empId: "EMP-001", name: "Juan Dela Cruz", date: "2026-10-02", timeIn: "8:10 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "5:00 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" },
    { empId: "EMP-001", name: "Juan Dela Cruz", date: "2026-10-05", timeIn: "8:00 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "", v: 2, status: "Incomplete", source: "Demo Attendance Feed" },
    { empId: "EMP-002", name: "Maria Santos", date: "2026-10-01", timeIn: "7:15 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "4:00 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" },
    { empId: "EMP-002", name: "Maria Santos", date: "2026-10-02", timeIn: "7:05 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "4:05 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" },
    { empId: "EMP-002", name: "Maria Santos", date: "2026-10-05", timeIn: "7:00 AM", timeOut: "12:00 PM", timeIn2: "", timeOut2: "", v: 2, status: "Incomplete", source: "Demo Attendance Feed" },
    { empId: "EMP-005", name: "Angela Reyes", date: "2026-10-01", timeIn: "9:00 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "6:00 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" },
    { empId: "EMP-005", name: "Angela Reyes", date: "2026-10-02", timeIn: "", timeOut: "", timeIn2: "1:00 PM", timeOut2: "6:00 PM", v: 2, status: "Incomplete", source: "Demo Attendance Feed" },
    { empId: "EMP-005", name: "Angela Reyes", date: "2026-10-05", timeIn: "9:12 AM", timeOut: "12:00 PM", timeIn2: "1:00 PM", timeOut2: "5:30 PM", v: 2, status: "Completed", source: "Demo Attendance Feed" }
  ],

  /* ---------- DELETED ATTENDANCE RECORDS ----------
     Deleting a DTR row leaves a tombstone {"EMP-001|2026-10-15": timestamp}. Without it the laptop/phone merge
     would bring the row back. A punch made AFTER the tombstone (newer _ts) shows up again, so a re-tap still works.
     PURGE_DTR = one-time removals shipped with the code (Juan's 2026-10-15 record). */
  PURGE_DTR: {
    'EMP-001|2026-10-15': Date.parse('2026-10-17T23:59:59+08:00'),
    'EMP-001|2026-10-17': Date.parse('2026-10-17T05:30:00+08:00')   // Juan's test punches today; only punches made BEFORE this time are hidden, so a new tap after it counts
  },
  _maxMap(a, b) { const m = Object.assign({}, a || {}); Object.keys(b || {}).forEach(k => { if (!(k in m) || b[k] > m[k]) m[k] = b[k]; }); return m; },
  async resetDemoData() {
    const stamp = Date.now();
    const employees = JSON.parse(JSON.stringify(this.seedEmployees)).map(e => ({ ...e, _ts: stamp }));
    const dtr = JSON.parse(JSON.stringify(this.seedDtr)).map(r => ({ ...r, _ts: stamp }));
    const leaves = JSON.parse(JSON.stringify(this.seedLeaves)).map(r => ({ ...r, _ts: stamp }));
    const appraisals = JSON.parse(JSON.stringify(this.seedAppraisals)).map(r => ({ ...r, _ts: stamp }));
    localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(employees));
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(dtr));
    localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(leaves));
    localStorage.setItem(this.KEYS.APPRAISALS, JSON.stringify(appraisals));
    localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify([]));
    localStorage.setItem(this.KEYS.REPORTS, JSON.stringify([]));
    localStorage.setItem(this.KEYS.RELEASED_PAYSLIPS, JSON.stringify([]));
    localStorage.setItem(this.KEYS.PAYROLL_RECORDS, JSON.stringify({}));
    localStorage.setItem(this.KEYS.DELETED, JSON.stringify({}));
    this._dirty = true;
    try { await this.flushToServer(5000); } catch (e) { this._setStatus("error", "demo data saved locally; server sync unavailable"); }
  },

  getDeletedDTR() { const d = localStorage.getItem(this.KEYS.DELETED); return this._maxMap(this.PURGE_DTR, d ? JSON.parse(d) : {}); },
  deleteDTRRecord(empId, date) {
    const m = this.getDeletedDTR(); m[empId + '|' + date] = Date.now();
    localStorage.setItem(this.KEYS.DELETED, JSON.stringify(m));
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(this.getDTR()));
    this.pushToServer();
  },

  /* ---------- SYNC with /api/v1/sync (shared by laptop + phone) ----------
     Server keeps {rev, state}. A client only overwrites if it saw the latest rev; otherwise
     the two copies are MERGED per record (newer _ts wins), so laptop and phone never wipe each other. */
  syncStatus: 'connecting', _dirty: false, _busy: false, _onStatus: null,
  _lastOk: 0, _sid: null,
  _setStatus(st, msg) {
    this.syncStatus = st;
    if (st === 'ok') this._lastOk = Date.now();
    this._lastErr = st === 'error' ? (msg || 'unreachable') : '';
    if (this._onStatus) this._onStatus(st);
    this._renderBadge();
  },
  // Badge = real connection indicator. Shows just "Synced" / "Offline"; tap it to see the technical details.
  _badgeDetail: false,
  _renderBadge() {
    const el = document.getElementById('syncBadge'); if (!el) return;
    if (el.addEventListener && !el._tapBound) {
      el._tapBound = true; el.style.cursor = 'pointer';
      el.addEventListener('click', () => { this._badgeDetail = !this._badgeDetail; this._renderBadge(); });
    }
    const age = this._lastOk ? Math.round((Date.now() - this._lastOk) / 1000) : null;
    const last = age === null ? 'never synced' : 'last sync ' + age + 's ago';
    let cls = 'bg-secondary', label = 'Connecting...', detail = 'Connecting to the server...';
    if (this.syncStatus === 'error') { cls = 'bg-danger'; label = 'Offline'; detail = 'Offline: ' + this._lastErr + ' · ' + last; }
    else if (this.syncStatus === 'ok' && age !== null && age > 6) { cls = 'bg-danger'; label = 'Offline'; detail = 'Offline: no response from server · ' + last; }
    else if (this.syncStatus === 'ok') {
      let n = 0; try { n = this.getDTR().length; } catch (e) {}
      cls = 'bg-success'; label = 'Synced';
      detail = 'Synced · ' + location.host + ' · srv ' + (this._sid || '?') + ' · rev ' + (localStorage.getItem('PMS_REV') || 0) + ' · ' + n + ' records · ' + age + 's ago';
    }
    el.className = 'badge ' + cls; el.innerText = '● ' + (this._badgeDetail ? detail : label); el.title = detail;
  },
  // fetch + parse with a 4s timeout (a dead hotspot used to hang forever and leave the badge on "Synced")
  async _getJson(url, opts = {}) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const r = await fetch(url, { ...opts, signal: ctl.signal });
      return await this._json(r);
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('timeout, no response from server');
      throw e;
    } finally { clearTimeout(timer); }
  },
  _state() { return { employees: this.getEmployees(), dtr: this.getDTR(), leaves: this.getLeaves(), appraisals: this.getAppraisals(), releasedPayslips: this.getReleasedPayslips(), payrollRecords: this.getPayrollRecords(), requests: this.getRequests(), reports: this.getReports(), deleted: this.getDeletedDTR() }; },
  _write(st) {
    localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(st.employees || []));
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(st.dtr || []));
    localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(st.leaves || []));
    localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(st.requests || []));
    localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(st.reports || []));
    localStorage.setItem(this.KEYS.APPRAISALS, JSON.stringify(st.appraisals || []));
    localStorage.setItem(this.KEYS.RELEASED_PAYSLIPS, JSON.stringify(st.releasedPayslips || []));
    localStorage.setItem(this.KEYS.PAYROLL_RECORDS, JSON.stringify(Array.isArray(st.payrollRecords) ? {} : (st.payrollRecords || {})));
    localStorage.setItem(this.KEYS.DELETED, JSON.stringify(this._maxMap(st.deleted, this.getDeletedDTR())));
  },
  _merge(remote, local) {
    const by = (r, l, key) => { const m = new Map(); (r || []).forEach(x => m.set(key(x), x)); (l || []).forEach(x => { const o = m.get(key(x)); if (!o || (x._ts || 0) >= (o._ts || 0)) m.set(key(x), x); }); return [...m.values()]; };
    return {
      employees: by(remote.employees, local.employees, x => x.id),
      dtr: by(remote.dtr, local.dtr, x => x.empId + '|' + x.date).sort((a, b) => (b.date + (b._ts || 0)).localeCompare(a.date + (a._ts || 0))),
      leaves: by(remote.leaves, local.leaves, x => x.controlNo),
      reports: by(remote.reports, local.reports, x => x.controlNo),
      requests: by(remote.requests, local.requests, x => x.controlNo),
      appraisals: by(remote.appraisals, local.appraisals, x => x.id),
      releasedPayslips: [],
      payrollRecords: this._mergePayroll(remote, local),
      deleted: this._maxMap(remote.deleted, local.deleted)
    };
  },
  _mergePayroll(remote, local) {
    const out = { ...(remote.payrollRecords || {}) };
    for (const [key, record] of Object.entries(local.payrollRecords || {})) {
      if (!out[key] || Number(record.updatedAt || 0) > Number(out[key].updatedAt || 0)) out[key] = record;
    }
    return out;
  },
  getPayrollRecords() {
    try { const v = JSON.parse(localStorage.getItem(this.KEYS.PAYROLL_RECORDS) || '{}') || {}; return Array.isArray(v) ? {} : v; }
    catch { return {}; }
  },
  getPayrollRecord(key) { return this.getPayrollRecords()[key] || null; },
  setPayrollRecord(key, record) {
    const records = this.getPayrollRecords();
    records[key] = { ...record, updatedAt: Date.now() };
    localStorage.setItem(this.KEYS.PAYROLL_RECORDS, JSON.stringify(records));
    this.pushToServer();
  },
  async _json(r) { const t = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status); try { return JSON.parse(t); } catch (e) { throw new Error('PHP error: ' + t.replace(/<[^>]*>/g, ' ').trim().slice(0, 90)); } },
  pushToServer() { this._dirty = true; this.pullFromServer(); },   // any local change = push soon
  async flushToServer(timeoutMs = 10000) {
    this._dirty = true;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (!this._busy) await this.pullFromServer();
      if (!this._busy && !this._dirty && this.syncStatus === 'ok') return true;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Server did not confirm saving. Check that the Laravel server is running and storage is writable.');
  },

  async pullFromServer(onUpdateCallback) {
    if (this._busy) return; this._busy = true;
    try {
      for (let i = 0; i < 5; i++) {
        let rev = Number(localStorage.getItem('PMS_REV') || 0), res;
        if (this._dirty) {
          // Clear the flag BEFORE sending: a punch saved while this request is in flight sets it again and goes out
          // in the next round. (Before, it was cleared AFTER the reply and that punch stayed on the phone only.)
          this._dirty = false;
          try { res = await this._getJson('/api/v1/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRev: rev, state: this._state() }) }); }
          catch (e) { this._dirty = true; throw e; }   // not delivered: keep it pending (also survives a page reload)
          if (res.sid) this._sid = res.sid;
          if (res.ok) { localStorage.setItem('PMS_REV', res.rev); if (this._dirty) continue; break; }
          this._dirty = true;
          if (res.rev !== undefined) { if (res.state) this._write(this._merge(res.state, this._state())); localStorage.setItem('PMS_REV', res.rev); continue; }  // conflict (or server file was reset): merge, adopt server rev, retry
          throw new Error(res.error || 'bad reply');
        }
        res = await this._getJson('/api/v1/sync?t=' + Date.now(), { cache: 'no-store' });
        if (res.sid) this._sid = res.sid;
        if (!res.state) { this._dirty = true; continue; }                   // server empty: first device uploads its data
        if (this._dirty) { this._write(this._merge(res.state, this._state())); localStorage.setItem('PMS_REV', res.rev); continue; }   // a punch was saved while this GET was in flight: merge, never overwrite
        if (res.rev !== rev) { this._write(res.state); localStorage.setItem('PMS_REV', res.rev); if (typeof onUpdateCallback === 'function') onUpdateCallback(); }
        break;
      }
      this._setStatus('ok');
    } catch (e) { this._setStatus('error', e.message === 'Failed to fetch' ? 'cannot reach server' : e.message); }
    this._busy = false;
  },

  getAuthUser() {
    const data = sessionStorage.getItem(this.KEYS.AUTH_USER);
    return data ? JSON.parse(data) : null;
  },

  setAuthUser(user) {
    sessionStorage.setItem(this.KEYS.AUTH_USER, JSON.stringify(user));
  },

  clearAuthUser() {
    sessionStorage.removeItem(this.KEYS.AUTH_USER);
  },

  getEmployees() {
    const data = localStorage.getItem(this.KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : this.seedEmployees;
  },

  updateEmployeeRfid(empId, newTag) {
    const employees = this.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      emp.nfcTag = newTag.trim(); emp._ts = Date.now();
      localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(employees));
      this.pushToServer();
      return true;
    }
    return false;
  },

  getDTR() {
    const data = localStorage.getItem(this.KEYS.DTR), gone = this.getDeletedDTR();
    return (data ? JSON.parse(data) : this.seedDtr).filter(r => { const t = gone[r.empId + '|' + r.date]; return t === undefined || (r._ts || 0) > t; });
  },

  saveDTRRecord(record) {
    record._ts = Date.now();
    const dtr = this.getDTR();
    const idx = dtr.findIndex(r => r.empId === record.empId && r.date === record.date);
    if (idx >= 0) {
      dtr[idx] = record;
    } else {
      dtr.unshift(record);
    }
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(dtr));
    this.pushToServer();
  },

  getLeaves() {
    const data = localStorage.getItem(this.KEYS.LEAVES);
    return data ? JSON.parse(data) : this.seedLeaves;
  },

  saveEmployee(emp) {
    emp._ts = Date.now();
    const list = this.getEmployees(); const i = list.findIndex(e => e.id === emp.id);
    if (i >= 0) list[i] = emp;
    localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(list)); this.pushToServer();
  },
  updateLeave(leave) {
    leave._ts = Date.now();
    const list = this.getLeaves(); const i = list.findIndex(l => l.controlNo === leave.controlNo);
    if (i >= 0) list[i] = leave;
    localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(list)); this.pushToServer();
  },
  getReports() { const d = localStorage.getItem(this.KEYS.REPORTS); return d ? JSON.parse(d) : []; },
  saveReport(r) { r._ts = Date.now(); const l = this.getReports(); l.unshift(r); localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(l)); this.pushToServer(); },
  getRequests() { const d = localStorage.getItem(this.KEYS.REQUESTS); return d ? JSON.parse(d) : []; },
  saveRequest(r) {   // insert or update by controlNo
    r._ts = Date.now();
    const list = this.getRequests(); const i = list.findIndex(x => x.controlNo === r.controlNo);
    if (i >= 0) list[i] = r; else list.unshift(r);
    localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(list)); this.pushToServer();
  },
  saveLeave(leave) {
    leave._ts = Date.now();
    const leaves = this.getLeaves();
    leaves.unshift(leave);
    localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(leaves));
    this.pushToServer();
  },

  getAppraisals() {
    const data = localStorage.getItem(this.KEYS.APPRAISALS);
    return data ? JSON.parse(data) : this.seedAppraisals;
  },

  getReleasedPayslips() {
    return Object.entries(this.getPayrollRecords()).filter(([, r]) => r.status === "released" && r.snapshot).map(([k]) => k);
  }
};

if (typeof document !== 'undefined') setInterval(() => PMSStore._renderBadge(), 1000);

// "_dirty" = there are local changes the server has not confirmed yet. Kept in localStorage (not just memory):
// if the kiosk page reloads or the phone sleeps after a tap that could not be sent, the tap is still pushed later
// instead of being overwritten by the server copy.
Object.defineProperty(PMSStore, '_dirty', {
  get() { try { return localStorage.getItem('PMS_DIRTY') === '1'; } catch (e) { return false; } },
  set(v) { try { localStorage.setItem('PMS_DIRTY', v ? '1' : '0'); } catch (e) {} },
  configurable: true
});
