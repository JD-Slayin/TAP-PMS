/* =========================================================
   TAP-PMS  |  api.js
   Every screen talks to the system ONLY through API.request().
   - Demo mode (default): requests are answered by the mock
     router below, which uses localStorage (js/store.js).
   - Real backend: set CONFIG.USE_REMOTE = true and point
     CONFIG.BASE_URL to the server. No UI code needs to change.
   All endpoints follow:  /api/v1/...  (JSON in, JSON out)
   ========================================================= */
(function (w, $) {
  'use strict';
  var T = w.TAP, U = T.util, DB = T.DB, Session = T.Session;

  var CONFIG = {
    USE_REMOTE: false,                       // true = call a real backend
    BASE_URL: 'http://localhost:3000/api/v1' // used only when USE_REMOTE is true
  };

  /* ---------- mini router ---------- */
  var R = [];
  function route(method, path, roles, handler) {
    var re = new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    R.push({ method: method, re: re, roles: roles, handler: handler });
  }
  function fail(code, message) { throw { code: code, message: message }; }
  function nameOf(db, no) { var e = db.employees.filter(function (x) { return x.no === no; })[0]; return e ? e.name : no; }
  function empOf(db, no) { return db.employees.filter(function (x) { return x.no === no; })[0]; }
  function nextId(prefix, arr) {
    var max = 0; arr.forEach(function (x) { var n = parseInt(String(x.id).replace(prefix, ''), 10); if (n > max) max = n; });
    return prefix + (max + 1);
  }
  function periodOf(id) { return T.PERIODS.filter(function (p) { return p.id === id; })[0] || fail(404, 'Pay period not found'); }
  function withName(db, list) { return list.map(function (x) { return $.extend({}, x, { name: nameOf(db, x.empNo) }); }); }
  function sortDesc(list, key) { return list.slice().sort(function (a, b) { return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0; }); }
  function filterBy(list, q, user) {
    var emp = user.role === 'Employee' ? user.no : q.empNo;
    return list.filter(function (x) { return (!emp || x.empNo === emp) && (!q.status || x.status === q.status); });
  }
  function decide(item, body) {
    if (['Approved', 'Rejected'].indexOf(body.status) < 0) fail(400, 'status must be Approved or Rejected');
    if (item.status !== 'Pending') fail(409, 'This request was already ' + item.status.toLowerCase());
  }

  /* ---------- auth ---------- */
  route('POST', '/auth/login', null, function (c) {
    var no = String(c.body.empNo || '').trim().toUpperCase();
    var u = c.db.users.filter(function (x) { return x.no.toUpperCase() === no && x.password === c.body.password; })[0];
    if (!u) fail(401, 'Invalid employee number or password');
    return { token: 'demo-' + u.no, user: { no: u.no, name: u.name, role: u.role } };
  });

  /* ---------- dashboard ---------- */
  function pendingCounts(db) {
    var p = function (a) { return a.filter(function (x) { return x.status === 'Pending'; }).length; };
    var o = { leave: p(db.leaves), overtime: p(db.overtime), schedule: p(db.schedReq), manual: p(db.manual) };
    o.total = o.leave + o.overtime + o.schedule + o.manual;
    return o;
  }
  route('GET', '/dashboard', ['Employee', 'HR', 'Admin'], function (c) {
    var db = c.db, today = U.todayISO();
    if (c.user.role === 'Employee') {
      var mine = db.attendance.filter(function (a) { return a.empNo === c.user.no; });
      var slips = [];
      T.PERIODS.forEach(function (p) {
        var run = db.payroll[p.id];
        if (run && run.status === 'Released') run.rows.forEach(function (r) { if (r.empNo === c.user.no) slips.push({ period: p, row: r }); });
      });
      return {
        today: mine.filter(function (a) { return a.date === today; })[0] || null,
        recent: sortDesc(mine, 'date').slice(0, 5),
        balances: db.balances[c.user.no],
        pending: {
          leave: db.leaves.filter(function (x) { return x.empNo === c.user.no && x.status === 'Pending'; }).length,
          overtime: db.overtime.filter(function (x) { return x.empNo === c.user.no && x.status === 'Pending'; }).length,
          schedule: db.schedReq.filter(function (x) { return x.empNo === c.user.no && x.status === 'Pending'; }).length,
          manual: db.manual.filter(function (x) { return x.empNo === c.user.no && x.status === 'Pending'; }).length
        },
        latestSlip: slips.length ? slips[slips.length - 1] : null
      };
    }
    // HR / Admin: last 7 working days
    var chart = [], d = new Date(), guard = 0;
    while (chart.length < 7 && guard++ < 30) {
      if (U.dow(d) < 5) {
        var k = U.iso(d), rows = db.attendance.filter(function (a) { return a.date === k; });
        chart.unshift({ date: k, present: rows.filter(function (a) { return a.status === 'Present'; }).length, late: rows.filter(function (a) { return a.status === 'Late'; }).length });
      }
      d = U.addDays(d, -1);
    }
    var active = db.employees.filter(function (e) { return e.status === 'Active'; });
    return {
      activeEmployees: active.length,
      presentToday: db.attendance.filter(function (a) { return a.date === today; }).length,
      onLeaveToday: db.leaves.filter(function (l) { return l.status === 'Approved' && l.start <= today && l.end >= today; }).length,
      pending: pendingCounts(db),
      chart: chart,
      payroll: T.PERIODS.map(function (p) { var r = db.payroll[p.id]; return { period: p, status: r ? r.status : 'Not run', total: r ? r.rows.reduce(function (s, x) { return s + x.net; }, 0) : 0 }; })
    };
  });

  /* ---------- employees & positions ---------- */
  route('GET', '/positions', ['Employee', 'HR', 'Admin'], function (c) { return c.db.positions; });
  function checkPosition(b, existing) {
    var min = Number(b.min), max = Number(b.max), fixed = Number(b.fixed);
    if (!String(b.title || '').trim()) fail(400, 'Position title is required');
    if (!(min > 0) || !(max >= min)) fail(400, 'Maximum must be greater than or equal to minimum');
    if (fixed < min || fixed > max) fail(400, 'Fixed rate must be inside the salary range');
    return { title: String(b.title).trim(), min: min, max: max, fixed: fixed };
  }
  route('POST', '/positions', ['Admin'], function (c) {
    var p = $.extend({ id: nextId('P', c.db.positions) }, checkPosition(c.body));
    c.db.positions.push(p); return p;
  });
  route('PUT', '/positions/:id', ['Admin'], function (c) {
    var p = c.db.positions.filter(function (x) { return x.id === c.params.id; })[0] || fail(404, 'Position not found');
    $.extend(p, checkPosition(c.body)); return p;
  });

  route('GET', '/employees', ['HR', 'Admin'], function (c) {
    return c.db.employees.map(function (e) {
      var p = c.db.positions.filter(function (x) { return x.id === e.positionId; })[0];
      return $.extend({}, e, { position: p ? p.title : '-' });
    });
  });
  function checkEmployee(db, b) {
    var pos = db.positions.filter(function (x) { return x.id === b.positionId; })[0];
    if (!String(b.name || '').trim()) fail(400, 'Full name is required');
    if (!pos) fail(400, 'Please choose a position');
    var rate = Number(b.rate);
    if (!(rate > 0)) fail(400, 'Monthly rate is required');
    if (rate < pos.min || rate > pos.max) fail(400, 'Rate must be within the position range (' + pos.min + ' - ' + pos.max + ')');
    return { name: String(b.name).trim(), positionId: pos.id, rate: rate, rfid: String(b.rfid || '').trim().toUpperCase(), loan: Number(b.loan) || 0, status: b.status === 'Inactive' ? 'Inactive' : 'Active',
             rateType: rate === pos.fixed ? 'Fixed' : 'Approved' };
  }
  route('POST', '/employees', ['HR', 'Admin'], function (c) {
    var v = checkEmployee(c.db, c.body);
    var yr = new Date().getFullYear(), n = c.db.employees.length + 1;
    var no = 'EMP-' + yr + '-' + String(n).padStart(3, '0');
    var e = $.extend({ no: no, approvedBy: v.rateType === 'Approved' ? c.user.name : null, schedule: ['On-site', 'On-site', 'On-site', 'On-site', 'On-site', 'Off', 'Off'] }, v);
    c.db.employees.push(e);
    c.db.users.push({ no: no, name: e.name, role: 'Employee', password: 'password' });
    c.db.balances[no] = {}; T.LEAVE_TYPES.forEach(function (t) { c.db.balances[no][t.key] = t.credits; });
    return e;
  });
  route('PUT', '/employees/:no', ['HR', 'Admin'], function (c) {
    var e = empOf(c.db, c.params.no) || fail(404, 'Employee not found');
    var v = checkEmployee(c.db, c.body);
    if (v.rateType === 'Approved' && (e.rate !== v.rate || e.rateType !== 'Approved')) e.approvedBy = c.user.name;
    if (v.rateType === 'Fixed') e.approvedBy = null;
    $.extend(e, v);
    c.db.users.forEach(function (u) { if (u.no === e.no) u.name = e.name; });
    return e;
  });

  route('GET', '/users', ['Admin'], function (c) { return c.db.users.map(function (u) { return { no: u.no, name: u.name, role: u.role }; }); });
  route('PATCH', '/users/:no', ['Admin'], function (c) {
    var u = c.db.users.filter(function (x) { return x.no === c.params.no; })[0] || fail(404, 'User not found');
    if (['Admin', 'HR', 'Employee'].indexOf(c.body.role) < 0) fail(400, 'Invalid role');
    if (u.no === c.user.no && c.body.role !== 'Admin') fail(400, 'You cannot remove your own Admin role');
    u.role = c.body.role; return { no: u.no, name: u.name, role: u.role };
  });

  /* ---------- attendance ---------- */
  route('GET', '/attendance', ['Employee', 'HR', 'Admin'], function (c) {
    var list = c.db.attendance.filter(function (a) { var emp = c.user.role === 'Employee' ? c.user.no : c.query.empNo; return !emp || a.empNo === emp; });
    return withName(c.db, sortDesc(list, 'date'));
  });
  route('POST', '/attendance/tap', ['Employee'], function (c) {          // called by the RFID reader
    var no = c.user.no, today = U.todayISO(), now = U.nowHM();
    var rec = c.db.attendance.filter(function (a) { return a.empNo === no && a.date === today; })[0];
    if (!rec) {
      rec = { id: nextId('A', c.db.attendance), empNo: no, date: today, timeIn: now, timeOut: null, source: 'RFID', status: now > T.LATE_AFTER ? 'Late' : 'Present' };
      c.db.attendance.push(rec); return { action: 'in', record: rec };
    }
    if (rec.timeOut) fail(409, 'You already timed out today');
    rec.timeOut = now; return { action: 'out', record: rec };
  });
  route('GET', '/attendance/manual', ['Employee', 'HR', 'Admin'], function (c) { return withName(c.db, sortDesc(filterBy(c.db.manual, c.query, c.user), 'filed')); });
  route('POST', '/attendance/manual', ['Employee'], function (c) {
    var b = c.body;
    if (!b.date || !b.timeIn || !b.timeOut) fail(400, 'Date, time in and time out are required');
    if (b.date > U.todayISO()) fail(400, 'You cannot file a manual entry for a future date');
    if (b.timeOut <= b.timeIn) fail(400, 'Time out must be later than time in');
    if (!String(b.reason || '').trim()) fail(400, 'Please give a reason');
    if (c.db.attendance.some(function (a) { return a.empNo === c.user.no && a.date === b.date; })) fail(409, 'You already have an attendance record on that date');
    var m = { id: nextId('M', c.db.manual), empNo: c.user.no, date: b.date, timeIn: b.timeIn, timeOut: b.timeOut, reason: String(b.reason).trim(), status: 'Pending', filed: U.todayISO() };
    c.db.manual.push(m); return m;
  });
  route('PATCH', '/attendance/manual/:id', ['HR'], function (c) {
    var m = c.db.manual.filter(function (x) { return x.id === c.params.id; })[0] || fail(404, 'Request not found');
    decide(m, c.body); m.status = c.body.status;
    if (m.status === 'Approved') {
      c.db.attendance.push({ id: nextId('A', c.db.attendance), empNo: m.empNo, date: m.date, timeIn: m.timeIn, timeOut: m.timeOut, source: 'Manual (HR approved)', status: m.timeIn > T.LATE_AFTER ? 'Late' : 'Present' });
    }
    return m;
  });

  /* ---------- leave ---------- */
  route('GET', '/leave-types', ['Employee', 'HR', 'Admin'], function () { return T.LEAVE_TYPES; });
  route('GET', '/leaves/balance/:empNo', ['Employee', 'HR', 'Admin'], function (c) {
    if (c.user.role === 'Employee' && c.params.empNo !== c.user.no) fail(403, 'Not allowed');
    return c.db.balances[c.params.empNo] || fail(404, 'Employee not found');
  });
  route('GET', '/leaves', ['Employee', 'HR', 'Admin'], function (c) {
    return withName(c.db, sortDesc(filterBy(c.db.leaves, c.query, c.user), 'filed')).map(function (x) {
      x.balance = (c.db.balances[x.empNo] || {})[x.type]; return x;      // days left, shown to HR when approving
    });
  });
  route('POST', '/leaves', ['Employee'], function (c) {
    var b = c.body, type = T.LEAVE_TYPES.filter(function (t) { return t.key === b.type; })[0];
    if (!type) fail(400, 'Please choose a leave type');
    if (!b.start || !b.end) fail(400, 'Start and end dates are required');
    if (b.end < b.start) fail(400, 'End date cannot be earlier than start date');
    var days = U.weekdaysBetween(b.start, b.end);
    if (days < 1) fail(400, 'The selected dates have no working days');
    if (!String(b.reason || '').trim()) fail(400, 'Please give a reason');
    var overlap = c.db.leaves.some(function (l) { return l.empNo === c.user.no && l.status !== 'Rejected' && l.start <= b.end && l.end >= b.start; });
    if (overlap) fail(409, 'You already have a leave request on those dates');
    var l = { id: nextId('L', c.db.leaves), empNo: c.user.no, type: b.type, start: b.start, end: b.end, days: days, paidDays: 0, unpaidDays: 0, reason: String(b.reason).trim(), status: 'Pending', filed: U.todayISO() };
    c.db.leaves.push(l); return l;
  });
  route('PATCH', '/leaves/:id', ['HR'], function (c) {
    var l = c.db.leaves.filter(function (x) { return x.id === c.params.id; })[0] || fail(404, 'Request not found');
    decide(l, c.body); l.status = c.body.status;
    if (l.status === 'Approved') {                       // the system deducts the days from the leave balance
      var bal = c.db.balances[l.empNo][l.type];
      l.paidDays = Math.min(l.days, bal); l.unpaidDays = l.days - l.paidDays;
      c.db.balances[l.empNo][l.type] = bal - l.paidDays;
    }
    return l;
  });

  /* ---------- overtime ---------- */
  route('GET', '/overtime', ['Employee', 'HR', 'Admin'], function (c) { return withName(c.db, sortDesc(filterBy(c.db.overtime, c.query, c.user), 'filed')); });
  route('POST', '/overtime', ['Employee'], function (c) {
    var b = c.body, h = Number(b.hours);
    if (!b.date) fail(400, 'Date is required');
    if (!(h >= 0.5 && h <= 6)) fail(400, 'Overtime must be between 0.5 and 6 hours');
    if (!String(b.reason || '').trim()) fail(400, 'Please give a reason');
    var o = { id: nextId('O', c.db.overtime), empNo: c.user.no, date: b.date, hours: h, reason: String(b.reason).trim(), status: 'Pending', filed: U.todayISO() };
    c.db.overtime.push(o); return o;
  });
  route('PATCH', '/overtime/:id', ['HR'], function (c) {
    var o = c.db.overtime.filter(function (x) { return x.id === c.params.id; })[0] || fail(404, 'Request not found');
    decide(o, c.body); o.status = c.body.status; return o;
  });

  /* ---------- schedule ---------- */
  route('GET', '/schedule', ['Employee'], function (c) { return empOf(c.db, c.user.no).schedule; });
  route('GET', '/schedule-requests', ['Employee', 'HR', 'Admin'], function (c) { return withName(c.db, sortDesc(filterBy(c.db.schedReq, c.query, c.user), 'filed')); });
  route('POST', '/schedule-requests', ['Employee'], function (c) {
    var b = c.body, ok = ['On-site', 'WFH', 'Off'];
    if (!Array.isArray(b.schedule) || b.schedule.length !== 7 || b.schedule.some(function (s) { return ok.indexOf(s) < 0; })) fail(400, 'Invalid schedule');
    if (b.schedule.slice(0, 5).every(function (s) { return s === 'Off'; })) fail(400, 'You must work at least one weekday');
    if (!b.effective) fail(400, 'Effective date is required');
    if (!String(b.reason || '').trim()) fail(400, 'Please give a reason');
    var s = { id: nextId('S', c.db.schedReq), empNo: c.user.no, schedule: b.schedule, effective: b.effective, reason: String(b.reason).trim(), status: 'Pending', filed: U.todayISO() };
    c.db.schedReq.push(s); return s;
  });
  route('PATCH', '/schedule-requests/:id', ['HR'], function (c) {
    var s = c.db.schedReq.filter(function (x) { return x.id === c.params.id; })[0] || fail(404, 'Request not found');
    decide(s, c.body); s.status = c.body.status;
    if (s.status === 'Approved') empOf(c.db, s.empNo).schedule = s.schedule;
    return s;
  });

  /* ---------- payroll, payslips, reports ---------- */
  route('GET', '/payroll', ['HR', 'Admin'], function (c) {
    var p = periodOf(c.query.period), r = c.db.payroll[p.id];
    return { period: p, status: r ? r.status : 'Not run', ranAt: r ? r.ranAt : null, rows: r ? r.rows : [] };
  });
  route('POST', '/payroll/run', ['HR'], function (c) {
    var p = periodOf(c.body.period), existing = c.db.payroll[p.id];
    if (existing && existing.status === 'Released') fail(409, 'This period was already released');
    var rows = c.db.employees.filter(function (e) { return e.status === 'Active'; }).map(function (e) { return T.computePay(c.db, e, p); });
    c.db.payroll[p.id] = { status: 'Draft', ranAt: U.todayISO(), rows: rows };
    return { period: p, status: 'Draft', ranAt: U.todayISO(), rows: rows };
  });
  route('POST', '/payroll/release', ['HR'], function (c) {
    var p = periodOf(c.body.period), r = c.db.payroll[p.id];
    if (!r) fail(400, 'Run the payroll first');
    r.status = 'Released'; return { period: p, status: r.status };
  });
  route('GET', '/payslips/:empNo', ['Employee', 'HR', 'Admin'], function (c) {
    if (c.user.role === 'Employee' && c.params.empNo !== c.user.no) fail(403, 'Not allowed');
    var out = [];
    T.PERIODS.forEach(function (p) {
      var run = c.db.payroll[p.id];
      if (!run || (run.status !== 'Released' && c.user.role === 'Employee')) return;
      run.rows.forEach(function (r) { if (r.empNo === c.params.empNo) out.push({ period: p, status: run.status, row: r }); });
    });
    return out;
  });
  route('GET', '/reports/payroll', ['HR', 'Admin'], function (c) {
    var p = periodOf(c.query.period);
    var rows = c.db.employees.filter(function (e) { return e.status === 'Active'; }).map(function (e) { return T.computePay(c.db, e, p); });
    var byPos = {};
    rows.forEach(function (r) {
      var k = r.position; byPos[k] = byPos[k] || { position: k, count: 0, gross: 0, ded: 0, net: 0 };
      byPos[k].count++; byPos[k].gross += r.gross; byPos[k].ded += r.totalDed; byPos[k].net += r.net;
    });
    var sum = function (k) { return U.r2(rows.reduce(function (s, r) { return s + r[k]; }, 0)); };
    return {
      period: p, rows: rows,
      byPosition: Object.keys(byPos).map(function (k) { return byPos[k]; }),
      remittances: { sss: sum('sss'), philhealth: sum('ph'), pagibig: sum('pagibig'), tax: sum('tax') },
      totals: { gross: sum('gross'), deductions: sum('totalDed'), net: sum('net') }
    };
  });

  /* ---------- request dispatcher ---------- */
  function local(method, url, body) {
    var d = $.Deferred();
    setTimeout(function () {
      try {
        var parts = url.split('?'), path = parts[0], query = {};
        new URLSearchParams(parts[1] || '').forEach(function (v, k) { query[k] = v; });
        var user = Session.get();
        for (var i = 0; i < R.length; i++) {
          var r = R[i], m = r.method === method && r.re.exec(path);
          if (!m) continue;
          if (r.roles) {
            if (!user) fail(401, 'Please log in');
            if (r.roles.indexOf(user.role) < 0) fail(403, 'Your role (' + user.role + ') is not allowed to do this');
          }
          var data = r.handler({ params: m.groups || {}, query: query, body: body || {}, user: user, db: DB.get() });
          DB.save();
          d.resolve({ status: 'success', data: data });
          return;
        }
        fail(404, 'Endpoint not found: ' + method + ' ' + path);
      } catch (e) {
        if (e && e.code) d.reject({ status: 'error', code: e.code, message: e.message });
        else { if (w.console) console.error(e); d.reject({ status: 'error', code: 500, message: 'Unexpected error: ' + e }); }
      }
    }, 60);
    return d.promise();
  }

  function remote(method, url, body) {
    var u = Session.get();
    return $.ajax({
      url: CONFIG.BASE_URL + url, method: method, contentType: 'application/json',
      data: body ? JSON.stringify(body) : undefined, dataType: 'json',
      headers: u ? { Authorization: 'Bearer ' + (u.token || '') } : {}
    }).then(function (res) { return res; }, function (xhr) {
      var j = xhr.responseJSON || {};
      return $.Deferred().reject({ status: 'error', code: xhr.status, message: j.message || 'Request failed' }).promise();
    });
  }

  w.API = {
    CONFIG: CONFIG,
    request: function (method, url, body) { return CONFIG.USE_REMOTE ? remote(method, url, body) : local(method, url, body); }
  };
})(window, jQuery);
