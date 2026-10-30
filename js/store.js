// tap-pms-ui/js/store.js

const PMSStore = {
  KEYS: {
    AUTH_USER: 'PMS_AUTH_USER',
    EMPLOYEES: 'PMS_EMPLOYEES',
    DTR: 'PMS_DTR',
    LEAVES: 'PMS_LEAVES',
    APPRAISALS: 'PMS_APPRAISALS',
    RELEASED_PAYSLIPS: 'PMS_RELEASED_PAYSLIPS',
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
      status: "Terminated",
      baseSalary: 28000,
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
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

  seedDtr: [],

  /* ---------- DELETED ATTENDANCE RECORDS ----------
     Deleting a DTR row leaves a tombstone {"EMP-001|2026-10-15": timestamp}. Without it the laptop/phone merge
     would bring the row back. A punch made AFTER the tombstone (newer _ts) shows up again, so a re-tap still works.
     PURGE_DTR = one-time removals shipped with the code (Juan's 2026-10-15 record). */
  PURGE_DTR: {
    'EMP-001|2026-10-15': Date.parse('2026-10-17T23:59:59+08:00'),
    'EMP-001|2026-10-17': Date.parse('2026-10-17T05:30:00+08:00')   // Juan's test punches today; only punches made BEFORE this time are hidden, so a new tap after it counts
  },
  _maxMap(a, b) { const m = Object.assign({}, a || {}); Object.keys(b || {}).forEach(k => { if (!(k in m) || b[k] > m[k]) m[k] = b[k]; }); return m; },
  getDeletedDTR() { const d = localStorage.getItem(this.KEYS.DELETED); return this._maxMap(this.PURGE_DTR, d ? JSON.parse(d) : {}); },
  deleteDTRRecord(empId, date) {
    const m = this.getDeletedDTR(); m[empId + '|' + date] = Date.now();
    localStorage.setItem(this.KEYS.DELETED, JSON.stringify(m));
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(this.getDTR()));
    this.pushToServer();
  },

  /* ---------- SYNC with sync.php (shared by laptop + phone) ----------
     Server keeps {rev, state}. A client only overwrites if it saw the latest rev; otherwise
     the two copies are MERGED per record (newer _ts wins), so laptop and phone never wipe each other. */
  syncStatus: 'connecting', _dirty: false, _busy: false, _onStatus: null,
  _setStatus(st, msg) { this.syncStatus = st; if (this._onStatus) this._onStatus(st); const el = document.getElementById('syncBadge'); if (el) { el.className = 'badge ' + (st === 'ok' ? 'bg-success' : st === 'error' ? 'bg-danger' : 'bg-secondary'); el.innerText = st === 'ok' ? 'Synced' : st === 'error' ? 'Sync failed: ' + (msg || 'unreachable') : 'Connecting...'; } },
  _state() { return { employees: this.getEmployees(), dtr: this.getDTR(), leaves: this.getLeaves(), appraisals: this.getAppraisals(), releasedPayslips: this.getReleasedPayslips(), requests: this.getRequests(), reports: this.getReports(), deleted: this.getDeletedDTR() }; },
  _write(st) {
    localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(st.employees || []));
    localStorage.setItem(this.KEYS.DTR, JSON.stringify(st.dtr || []));
    localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(st.leaves || []));
    localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(st.requests || []));
    localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(st.reports || []));
    localStorage.setItem(this.KEYS.APPRAISALS, JSON.stringify(st.appraisals || []));
    localStorage.setItem(this.KEYS.RELEASED_PAYSLIPS, JSON.stringify(st.releasedPayslips || []));
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
      releasedPayslips: [...new Set([...(remote.releasedPayslips || []), ...(local.releasedPayslips || [])])],
      deleted: this._maxMap(remote.deleted, local.deleted)
    };
  },
  async _json(r) { const t = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status); try { return JSON.parse(t); } catch (e) { throw new Error('PHP error: ' + t.replace(/<[^>]*>/g, ' ').trim().slice(0, 90)); } },
  pushToServer() { this._dirty = true; this.pullFromServer(); },   // any local change = push soon

  async pullFromServer(onUpdateCallback) {
    if (this._busy) return; this._busy = true;
    try {
      for (let i = 0; i < 4; i++) {
        let rev = Number(localStorage.getItem('PMS_REV') || 0), res;
        if (this._dirty) {
          res = await this._json(await fetch('sync.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRev: rev, state: this._state() }) }));
          if (res.ok) { localStorage.setItem('PMS_REV', res.rev); this._dirty = false; break; }
          if (res.rev !== undefined) { if (res.state) this._write(this._merge(res.state, this._state())); localStorage.setItem('PMS_REV', res.rev); continue; }  // conflict (or server file was reset): merge, adopt server rev, retry
          throw new Error(res.error || 'bad reply');
        }
        res = await this._json(await fetch('sync.php?t=' + Date.now(), { cache: 'no-store' }));
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
    const data = localStorage.getItem(this.KEYS.RELEASED_PAYSLIPS);
    return data ? JSON.parse(data) : ["EMP-001"];
  },

  saveReleasedPayslips(list) {
    localStorage.setItem(this.KEYS.RELEASED_PAYSLIPS, JSON.stringify(list));
    this.pushToServer();
  }
};