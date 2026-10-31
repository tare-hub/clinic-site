// ════════════════════════════════════════════════════
//  MEDCARE CLINIC — ADMIN DASHBOARD
// ════════════════════════════════════════════════════

const API = '../api/admin-api.php';
const APPT_API = '../api/appointment.php';

// ── LOCAL STORAGE FALLBACK (no PHP) ──────────────────
const localAppts    = () => JSON.parse(localStorage.getItem('clinic_appts')    || '[]');
const localPatients = () => JSON.parse(localStorage.getItem('clinic_users')    || '[]');
const localContacts = () => JSON.parse(localStorage.getItem('clinic_contacts') || '[]');
const saveAppts     = d  => localStorage.setItem('clinic_appts',    JSON.stringify(d));
const saveContacts  = d  => localStorage.setItem('clinic_contacts', JSON.stringify(d));

// ── STATE ─────────────────────────────────────────────
let useLocal   = false;
let apptPage   = 1;
let currentAppt= null;

// ── GATE LOGIN ────────────────────────────────────────
document.getElementById('gBtn').addEventListener('click', login);
document.getElementById('gPass').addEventListener('keydown', e => { if (e.key==='Enter') login(); });

async function login() {
  const u    = document.getElementById('gUser').value.trim();
  const p    = document.getElementById('gPass').value;
  const err  = document.getElementById('gErr');

  if (!u || !p) { err.textContent = 'Please enter username and password.'; return; }

  try {
    const fd = new FormData();
    fd.append('username', u); fd.append('password', p); fd.append('action', 'login');
    const res  = await fetch(API, { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      sessionStorage.setItem('clinic_admin', json.username || u);
      showDashboard(json.username || u);
    } else {
      err.textContent = json.message;
    }
  } catch {
    // No PHP — fallback
    if (u === 'admin' && p === 'admin123') {
      useLocal = true;
      sessionStorage.setItem('clinic_admin', u);
      showDashboard(u);
    } else {
      err.textContent = 'Invalid credentials.';
    }
  }
}

function showDashboard(name) {
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('adminName').textContent = name;
  loadStats();
  loadRecentAppts();
}

// Auto-login if session exists
const savedAdmin = sessionStorage.getItem('clinic_admin');
if (savedAdmin) showDashboard(savedAdmin);

// ── LOGOUT ────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async e => {
  e.preventDefault();
  try { await fetch(API + '?action=logout'); } catch {}
  sessionStorage.removeItem('clinic_admin');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('gate').classList.remove('hidden');
});

// ── SIDEBAR NAV ───────────────────────────────────────
const secTitles = { overview:'Overview', appointments:'Appointments', patients:'Patients', messages:'Messages' };
document.querySelectorAll('.snl').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.snl').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    const s = link.dataset.s;
    document.getElementById('sec' + s.charAt(0).toUpperCase() + s.slice(1)).classList.add('active');
    document.getElementById('secTitle').textContent = secTitles[s] || s;
    if (s === 'appointments') loadAppts();
    if (s === 'patients')     loadPatients();
    if (s === 'messages')     loadMessages();
  });
});

// Mobile sidebar
document.getElementById('mobBtn').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// ── STATS ─────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(API + '?action=stats');
    const json = await res.json();
    if (json.success) {
      document.getElementById('stPatients').textContent = json.patients;
      document.getElementById('stAppts').textContent    = json.appointments;
      document.getElementById('stPending').textContent  = json.pending;
      document.getElementById('stMsgs').textContent     = json.contacts;
      document.getElementById('pendingBadge').textContent = json.pending;
      document.getElementById('msgBadge').textContent    = json.contacts;
      return;
    }
  } catch {}

  // Local fallback
  const appts    = localAppts();
  const patients = localPatients();
  const contacts = localContacts();
  const pending  = appts.filter(a => a.status === 'pending').length;
  document.getElementById('stPatients').textContent = patients.length;
  document.getElementById('stAppts').textContent    = appts.length;
  document.getElementById('stPending').textContent  = pending;
  document.getElementById('stMsgs').textContent     = contacts.filter(c => !c.read).length;
  document.getElementById('pendingBadge').textContent = pending;
  document.getElementById('msgBadge').textContent    = contacts.filter(c => !c.read).length;
}

// ── RECENT APPOINTMENTS (OVERVIEW) ────────────────────
async function loadRecentAppts() {
  let appts = [];
  try {
    const res  = await fetch(API + '?action=get_appointments&page=1');
    const json = await res.json();
    if (json.success) appts = json.appointments.slice(0, 6);
  } catch {
    appts = localAppts().slice(0, 6);
  }

  document.getElementById('recentAppts').innerHTML = appts.length
    ? appts.map(a => `<tr>
        <td>${a.first_name || a.name || '—'} ${a.last_name || ''}</td>
        <td>${a.department}</td>
        <td>${a.appointment_date || a.date}</td>
        <td><span class="sb ${a.status}">${a.status}</span></td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty-td">No appointments yet.</td></tr>`;

  // Status breakdown
  const all = localAppts();
  const counts = { pending:0, confirmed:0, completed:0, cancelled:0 };
  all.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
  const total = all.length || 1;
  const colors = { pending:'#f59e0b', confirmed:'#00b894', completed:'#1a73e8', cancelled:'#ef4444' };
  document.getElementById('statusBreakdown').innerHTML = Object.entries(counts).map(([s, c]) => `
    <div class="sb-row">
      <span class="sb-label">${s.charAt(0).toUpperCase()+s.slice(1)}</span>
      <div class="sb-bar"><div class="sb-fill" style="width:${Math.round(c/total*100)}%;background:${colors[s]}"></div></div>
      <span class="sb-count">${c}</span>
    </div>`).join('');
}

// ── APPOINTMENTS TABLE ────────────────────────────────
async function loadAppts(page = 1) {
  apptPage = page;
  const search = document.getElementById('apptSearch').value;
  const status = document.getElementById('apptStatusFilter').value;
  let appts = [], totalPages = 1;

  try {
    const url = `${API}?action=get_appointments&page=${page}&search=${encodeURIComponent(search)}&status=${status}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (json.success) { appts = json.appointments; totalPages = json.pages; }
  } catch {
    let all = localAppts();
    if (search) all = all.filter(a => (a.name||'').toLowerCase().includes(search.toLowerCase()) || (a.email||'').toLowerCase().includes(search.toLowerCase()) || (a.department||'').toLowerCase().includes(search.toLowerCase()));
    if (status) all = all.filter(a => a.status === status);
    totalPages = Math.ceil(all.length / 15) || 1;
    appts = all.slice((page-1)*15, page*15);
  }

  document.getElementById('apptBody').innerHTML = appts.length
    ? appts.map((a, i) => `<tr>
        <td><code>#${String(a.id || i+1).slice(-5)}</code></td>
        <td><strong>${a.first_name || a.name || ''} ${a.last_name || ''}</strong></td>
        <td>${a.email || '—'}<br><small style="color:#94a3b8">${a.phone || ''}</small></td>
        <td>${a.department}</td>
        <td>${a.doctor || 'Any'}</td>
        <td>${a.appointment_date || a.date}<br><small>${a.appointment_time || a.time || ''}</small></td>
        <td>${a.visit_type || a.type || 'in-person'}</td>
        <td><span class="sb ${a.status}">${a.status}</span></td>
        <td>
          <button class="tbl-btn view" onclick="viewAppt(${i})">View</button>
          <button class="tbl-btn confirm" onclick="quickStatus(${i},'confirmed')">✓</button>
          <button class="tbl-btn cancel" onclick="quickStatus(${i},'cancelled')">✕</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="9" class="empty-td">No appointments found.</td></tr>`;

  // Store for detail view
  window._apptData = appts;

  // Pagination
  document.getElementById('apptPages').innerHTML = Array.from({length: totalPages}, (_, i) =>
    `<button class="pg ${i+1===page?'active':''}" onclick="loadAppts(${i+1})">${i+1}</button>`
  ).join('');
}

window.viewAppt = function(i) {
  const a = window._apptData[i];
  if (!a) return;
  currentAppt = a;
  const p = document.getElementById('detailPanel');
  document.getElementById('detailStatus').value = a.status || 'pending';
  document.getElementById('detailNotes').value  = a.notes  || '';
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><label>Patient</label><span>${a.first_name||a.name||''} ${a.last_name||''}</span></div>
      <div class="detail-row"><label>Email</label><span>${a.email||'—'}</span></div>
      <div class="detail-row"><label>Phone</label><span>${a.phone||'—'}</span></div>
      <div class="detail-row"><label>Department</label><span>${a.department}</span></div>
      <div class="detail-row"><label>Doctor</label><span>${a.doctor||'Any'}</span></div>
      <div class="detail-row"><label>Date</label><span>${a.appointment_date||a.date||'—'}</span></div>
      <div class="detail-row"><label>Time</label><span>${a.appointment_time||a.time||'—'}</span></div>
      <div class="detail-row"><label>Type</label><span>${a.visit_type||a.type||'—'}</span></div>
    </div>
    ${a.symptoms ? `<div class="detail-row"><label>Symptoms</label><span>${a.symptoms}</span></div>` : ''}
    ${a.insurance ? `<div class="detail-row"><label>Insurance</label><span>${a.insurance}</span></div>` : ''}
  `;
  p.classList.add('open');
};

document.getElementById('detailClose').addEventListener('click', () => {
  document.getElementById('detailPanel').classList.remove('open');
});

document.getElementById('saveDetail').addEventListener('click', async () => {
  if (!currentAppt) return;
  const status = document.getElementById('detailStatus').value;
  const notes  = document.getElementById('detailNotes').value;

  try {
    const fd = new FormData();
    fd.append('action','update_appointment');
    fd.append('id', currentAppt.id);
    fd.append('status', status);
    fd.append('notes', notes);
    await fetch(API, { method:'POST', body: fd });
  } catch {}

  // Local fallback
  const appts = localAppts();
  const idx = appts.findIndex(a => a.id === currentAppt.id || a.email === currentAppt.email);
  if (idx > -1) { appts[idx].status = status; appts[idx].notes = notes; saveAppts(appts); }

  document.getElementById('detailPanel').classList.remove('open');
  loadAppts(apptPage);
  loadStats();
});

// ── EMAIL PATIENT BUTTON ──────────────────────────────
document.getElementById('sendEmailBtn')?.addEventListener('click', async () => {
  if (!currentAppt) return;
  const status  = document.getElementById('detailStatus').value;
  const statusEl= document.getElementById('emailStatus');

  if (!['confirmed','cancelled'].includes(status)) {
    statusEl.style.color = '#f59e0b';
    statusEl.textContent = 'Select "confirmed" or "cancelled" to send email.';
    return;
  }

  statusEl.style.color = '#64748b';
  statusEl.textContent = 'Sending…';

  try {
    const fd = new FormData();
    fd.append('action',           'send_status_email');
    fd.append('id',               currentAppt.id || '');
    fd.append('status',           status);
    fd.append('email',            currentAppt.email || '');
    fd.append('first_name',       currentAppt.first_name || (currentAppt.name||'').split(' ')[0] || '');
    fd.append('last_name',        currentAppt.last_name  || (currentAppt.name||'').split(' ')[1] || '');
    fd.append('department',       currentAppt.department || '');
    fd.append('appointment_date', currentAppt.appointment_date || currentAppt.date || '');
    fd.append('appointment_time', currentAppt.appointment_time || currentAppt.time || '');
    const res  = await fetch(API, { method:'POST', body: fd });
    const json = await res.json();
    statusEl.style.color = json.success ? '#16a34a' : '#ef4444';
    statusEl.textContent = json.message;
  } catch {
    statusEl.style.color = '#f59e0b';
    statusEl.textContent = 'PHP unavailable — emails only work with server backend.';
  }
});

window.quickStatus = function(i, status) {
  const a = window._apptData?.[i];
  if (!a) return;
  const appts = localAppts();
  const idx = appts.findIndex(x => x.id === a.id || x.email === a.email);
  if (idx > -1) { appts[idx].status = status; saveAppts(appts); }
  loadAppts(apptPage);
  loadStats();
};

// Filters
document.getElementById('apptSearch').addEventListener('input', () => loadAppts(1));
document.getElementById('apptStatusFilter').addEventListener('change', () => loadAppts(1));

// ── PATIENTS ──────────────────────────────────────────
async function loadPatients(search = '') {
  let patients = [];
  try {
    const res  = await fetch(`${API}?action=get_patients&search=${encodeURIComponent(search)}`);
    const json = await res.json();
    if (json.success) patients = json.patients;
  } catch {
    patients = localPatients();
    if (search) patients = patients.filter(p =>
      (p.first||'').toLowerCase().includes(search.toLowerCase()) ||
      (p.email||'').toLowerCase().includes(search.toLowerCase()));
  }

  const appts = localAppts();
  document.getElementById('patBody').innerHTML = patients.length
    ? patients.map((p, i) => {
        const bookings = appts.filter(a => a.email === p.email).length;
        const name = p.first_name ? p.first_name + ' ' + p.last_name : (p.first + ' ' + p.last);
        return `<tr>
          <td><strong>${name}</strong></td>
          <td>${p.email}</td>
          <td>${p.phone||'—'}</td>
          <td>${p.created_at || p.createdAt || '—'}</td>
          <td><span style="background:#e0f2fe;color:#0c4a6e;padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:700">${bookings}</span></td>
          <td><button class="tbl-btn del" onclick="deletePat(${i})">Remove</button></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" class="empty-td">No patients registered.</td></tr>`;

  window._patData = patients;
}

window.deletePat = async function(i) {
  if (!confirm('Remove this patient?')) return;
  const p = window._patData[i];
  try {
    const fd = new FormData();
    fd.append('action','delete_patient'); fd.append('id', p.id);
    await fetch(API, { method:'POST', body: fd });
  } catch {}
  const users = localPatients();
  const idx = users.findIndex(u => u.email === p.email);
  if (idx > -1) { users.splice(idx, 1); localStorage.setItem('clinic_users', JSON.stringify(users)); }
  loadPatients();
};

document.getElementById('patSearch').addEventListener('input', function() {
  loadPatients(this.value);
});

// ── MESSAGES ─────────────────────────────────────────
async function loadMessages() {
  let msgs = [];
  try {
    const res  = await fetch(`${API}?action=get_contacts`);
    const json = await res.json();
    if (json.success) msgs = json.contacts;
  } catch {
    msgs = localContacts();
  }

  document.getElementById('msgList').innerHTML = msgs.length
    ? msgs.map((m, i) => `
        <div class="msg-item ${m.is_read||m.read ? '' : 'unread'}">
          <div class="msg-icon"><i class="fa fa-envelope"></i></div>
          <div class="msg-body">
            <strong>${m.name}</strong>
            <div class="msg-sub">${m.subject || 'No Subject'}</div>
            <p>${m.message}</p>
            <div class="msg-meta">${m.email} · ${m.created_at || m.createdAt || 'Just now'}</div>
          </div>
          <button class="msg-del" onclick="deleteMsg(${i})">Delete</button>
        </div>`).join('')
    : `<p style="color:#94a3b8;padding:20px;font-size:.88rem;text-align:center">No messages yet.</p>`;

  window._msgData = msgs;
  // Mark all read
  const contacts = localContacts().map(c => ({...c, read: true}));
  saveContacts(contacts);
  document.getElementById('msgBadge').textContent = '0';
  document.getElementById('stMsgs').textContent   = '0';
}

window.deleteMsg = async function(i) {
  const m = window._msgData[i];
  try {
    const fd = new FormData();
    fd.append('action','delete_contact'); fd.append('id', m.id);
    await fetch(API, { method:'POST', body: fd });
  } catch {}
  const contacts = localContacts();
  const idx = contacts.findIndex(c => c.id === m.id || c.email === m.email);
  if (idx > -1) { contacts.splice(idx, 1); saveContacts(contacts); }
  loadMessages();
};

// Save contact messages from contact form to localStorage for admin view
window.saveContactMessage = function(data) {
  const contacts = localContacts();
  contacts.unshift({ id: Date.now(), ...data, read: false, createdAt: new Date().toLocaleString() });
  saveContacts(contacts);
};
