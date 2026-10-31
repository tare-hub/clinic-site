// ════════════════════════════════════════════════════
//  MEDCARE — PATIENT DASHBOARD (dashboard.html)
// ════════════════════════════════════════════════════

const getSession  = () => JSON.parse(sessionStorage.getItem("clinic_user") || "null");
const setSession  = u  => sessionStorage.setItem("clinic_user", JSON.stringify(u));
const getUsers    = () => JSON.parse(localStorage.getItem("clinic_users")  || "[]");
const saveUsers   = u  => localStorage.setItem("clinic_users",  JSON.stringify(u));
const getAppts    = () => JSON.parse(localStorage.getItem("clinic_appts")  || "[]");
const saveAppts   = d  => localStorage.setItem("clinic_appts",  JSON.stringify(d));

// ── GUARD ─────────────────────────────────────────────
const user = getSession();
if (!user) window.location.href = "login.html";

// ── POPULATE HEADER ───────────────────────────────────
document.getElementById("sidebarName").textContent  = user.first + " " + user.last;
document.getElementById("sidebarEmail").textContent = user.email;
document.getElementById("welcomeName").textContent  = user.first;

// ── LOGOUT ────────────────────────────────────────────
document.getElementById("logoutBtn").addEventListener("click", e => {
  e.preventDefault();
  sessionStorage.removeItem("clinic_user");
  window.location.href = "login.html";
});

// ── SIDEBAR NAV ───────────────────────────────────────
const secTitles = { overview:"Overview", appointments:"Appointments", records:"Medical Records", profile:"My Profile" };

function switchSec(id) {
  document.querySelectorAll(".dsnl").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".dsec").forEach(s => s.classList.remove("active"));
  document.querySelector(`.dsnl[data-sec="${id}"]`)?.classList.add("active");
  document.getElementById("sec" + id.charAt(0).toUpperCase() + id.slice(1))?.classList.add("active");
  document.getElementById("dtTitle").textContent = secTitles[id] || id;
  document.querySelector(".dash-sidebar")?.classList.remove("open");
}

document.querySelectorAll(".dsnl").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    switchSec(link.dataset.sec);
    if (link.dataset.sec === "appointments") renderAppts("all");
    if (link.dataset.sec === "profile")      fillProfile();
  });
});

// "View all" links inside overview cards
document.querySelectorAll(".dsnl-link[data-sec]").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    switchSec(a.dataset.sec);
    renderAppts("all");
  });
});

// Mobile toggle
document.getElementById("mobToggle")?.addEventListener("click", () => {
  document.querySelector(".dash-sidebar")?.classList.toggle("open");
});

// ── LOAD OVERVIEW ─────────────────────────────────────
function loadOverview() {
  const all      = getAppts().filter(a => a.email === user.email);
  const today    = new Date(); today.setHours(0,0,0,0);
  const upcoming = all.filter(a => new Date(a.date || a.appointment_date) >= today && a.status !== "cancelled");
  const completed= all.filter(a => a.status === "completed");

  document.getElementById("statTotal").textContent     = all.length;
  document.getElementById("statUpcoming").textContent  = upcoming.length;
  document.getElementById("statCompleted").textContent = completed.length;

  // Badge on sidebar
  const badge = document.getElementById("apptBadge");
  if (upcoming.length > 0) {
    badge.textContent = upcoming.length;
    badge.classList.add("show");
  }

  // Next appointment
  const next = upcoming.sort((a,b) =>
    new Date(a.date || a.appointment_date) - new Date(b.date || b.appointment_date)
  )[0];

  document.getElementById("nextAppt").innerHTML = next
    ? `<div class="appt-card">
        <div class="appt-card-icon"><i class="fa fa-calendar-check"></i></div>
        <div class="appt-card-info">
          <strong>${next.department}</strong>
          <span>${next.doctor || "Doctor TBD"} &nbsp;·&nbsp; ${next.date || next.appointment_date} at ${next.time || next.appointment_time}</span>
        </div>
        <div class="appt-card-right">
          <span class="status-pill ${next.status}">${next.status}</span>
        </div>
      </div>`
    : `<div class="empty-state">
        <i class="fa fa-calendar-xmark"></i>
        <p>No upcoming appointments</p>
        <a href="appointment.html" class="btn btn-primary btn-sm">Book Now</a>
      </div>`;
}

// ── RENDER APPOINTMENTS ───────────────────────────────
let currentFilter = "all";

function renderAppts(filter) {
  currentFilter = filter;

  // Update filter buttons
  document.querySelectorAll(".af-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === filter);
  });

  const all  = getAppts().filter(a => a.email === user.email);
  const list = filter === "all" ? all : all.filter(a => a.status === filter);
  const sorted = list.sort((a,b) =>
    new Date(b.date || b.appointment_date) - new Date(a.date || a.appointment_date)
  );

  const container = document.getElementById("apptListFull");
  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa fa-calendar"></i>
      <p>${filter === "all" ? "No appointments yet." : "No " + filter + " appointments."}</p>
      ${filter === "all" ? '<a href="appointment.html" class="btn btn-primary btn-sm">Book Now</a>' : ""}
    </div>`;
    return;
  }

  container.innerHTML = sorted.map((a, i) => {
    const canCancel = a.status === "pending" || a.status === "confirmed";
    const apptId    = a.id || i;
    return `<div class="appt-card" id="ac_${apptId}">
      <div class="appt-card-icon"><i class="fa fa-hospital"></i></div>
      <div class="appt-card-info">
        <strong>${a.department}</strong>
        <span>
          ${a.doctor || "TBD"} &nbsp;·&nbsp;
          ${a.date || a.appointment_date} at ${a.time || a.appointment_time} &nbsp;·&nbsp;
          ${a.type || a.visit_type || "In-Person"}
        </span>
      </div>
      <div class="appt-card-right">
        <span class="status-pill ${a.status}">${a.status}</span>
        ${canCancel
          ? `<button class="cancel-btn" onclick="cancelAppt(${apptId}, '${a.email}', ${getAppts().indexOf(a)})">Cancel</button>`
          : ""}
      </div>
    </div>`;
  }).join("");
}

// Filter buttons
document.querySelectorAll(".af-btn").forEach(btn => {
  btn.addEventListener("click", () => renderAppts(btn.dataset.filter));
});

// ── CANCEL APPOINTMENT ────────────────────────────────
window.cancelAppt = function(apptId, email, listIndex) {
  if (!confirm("Cancel this appointment?")) return;
  const appts = getAppts();
  // Find by id, then fallback to list index
  let idx = appts.findIndex(a => String(a.id) === String(apptId));
  if (idx === -1 && listIndex >= 0 && listIndex < appts.length) idx = listIndex;
  if (idx === -1) idx = appts.findIndex(a => a.email === email && (a.status === "pending" || a.status === "confirmed"));

  if (idx > -1) {
    appts[idx].status = "cancelled";
    saveAppts(appts);
    toast("Appointment cancelled.", "info");
    renderAppts(currentFilter);
    loadOverview();
  }
};

// ── PROFILE ───────────────────────────────────────────
function fillProfile() {
  document.getElementById("profFirst").value  = user.first  || "";
  document.getElementById("profLast").value   = user.last   || "";
  document.getElementById("profEmail").value  = user.email  || "";
  document.getElementById("profPhone").value  = user.phone  || "";
  document.getElementById("profDob").value    = user.dob    || "";
  const b = document.getElementById("profBlood");
  if (b && user.blood) b.value = user.blood;
}

document.getElementById("profileForm")?.addEventListener("submit", function(e) {
  e.preventDefault();
  const msg = document.getElementById("profMsg");
  user.first = document.getElementById("profFirst").value.trim();
  user.last  = document.getElementById("profLast").value.trim();
  user.phone = document.getElementById("profPhone").value.trim();
  user.dob   = document.getElementById("profDob").value;
  user.blood = document.getElementById("profBlood").value;

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === user.email);
  if (idx > -1) { Object.assign(users[idx], user); saveUsers(users); }
  setSession(user);
  document.getElementById("sidebarName").textContent = user.first + " " + user.last;
  document.getElementById("welcomeName").textContent = user.first;
  setMsg(msg, "✅ Profile saved successfully!", "success");
  toast("Profile updated.", "success");
});

// ── CHANGE PASSWORD ───────────────────────────────────
document.getElementById("changePwBtn")?.addEventListener("click", () => {
  const current = document.getElementById("pwCurrent").value;
  const newPw   = document.getElementById("pwNew").value;
  const confirm = document.getElementById("pwConfirm").value;
  const msg     = document.getElementById("pwMsg");

  setMsg(msg, "", "");
  if (!current || !newPw || !confirm) return setMsg(msg, "Please fill all fields.", "error");

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === user.email);
  if (idx === -1) return setMsg(msg, "User not found.", "error");

  if (users[idx].password !== current) return setMsg(msg, "Current password is incorrect.", "error");
  if (newPw.length < 6)               return setMsg(msg, "New password must be at least 6 characters.", "error");
  if (newPw !== confirm)               return setMsg(msg, "Passwords do not match.", "error");

  users[idx].password = newPw;
  user.password = newPw;
  saveUsers(users);
  setSession(user);
  ["pwCurrent","pwNew","pwConfirm"].forEach(id => document.getElementById(id).value = "");
  setMsg(msg, "✅ Password updated!", "success");
  toast("Password changed successfully.", "success");
});

// ── TOAST ─────────────────────────────────────────────
function toast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const t = document.createElement("div");
  t.className   = "toast-msg " + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4000);
}

// ── UTIL ─────────────────────────────────────────────
function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className   = "form-msg " + (type || "");
}

// ── INIT ─────────────────────────────────────────────
loadOverview();
fillProfile();

// ════════════════════════════════════════════════════
//  PDF GENERATION — PHP first, jsPDF fallback
// ════════════════════════════════════════════════════

// Try PHP PDF endpoint — open as download link
// Returns true if PHP is available, false to trigger jsPDF fallback
async function tryPhpPDF(params) {
  const user = getSession();
  if (!user) return false;

  const url = 'api/pdf.php?' + new URLSearchParams({ ...params, email: user.email });

  // Quick probe: fetch just the first bytes to check Content-Type
  try {
    const res = await fetch(url);
    const ct  = res.headers.get('Content-Type') || '';

    if (ct.includes('application/pdf')) {
      // PHP returned a PDF — trigger download via anchor
      const blob   = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fname = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
                    || 'MedCare_Report.pdf';
      a.href     = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return true;
    }

    if (ct.includes('application/json')) {
      const j = await res.json();
      if (!j.success) {
        console.info('PHP PDF unavailable:', j.message, '— using jsPDF fallback');
      }
      return false;
    }

    return false;
  } catch {
    return false; // no PHP server — use jsPDF
  }
}

// ── Download single record ────────────────────────────
window.downloadRecordPDF = async function(record) {
  const user = getSession();
  if (!user) return;

  const idMap = {
    'Blood Test Results': 'blood_test',
    'ECG Report':         'ecg',
    'Prescription':       'prescription',
    'Chest X-Ray Report': 'xray',
  };
  const phpId = idMap[record.title] || 'blood_test';

  toast('Preparing PDF…', 'info');
  const phpOk = await tryPhpPDF({ type: 'record', id: phpId });
  if (!phpOk) {
    toast('Generating PDF…', 'info');
    downloadRecordPDF_JS(record);
  }
};

// ── Download all records ──────────────────────────────
window.downloadAllRecordsPDF = async function() {
  toast('Preparing all records PDF…', 'info');
  const phpOk = await tryPhpPDF({ type: 'all_records' });
  if (!phpOk) {
    toast('Generating PDF…', 'info');
    downloadAllRecordsPDF_JS();
  }
};

// ── Download all appointments ─────────────────────────
window.downloadAppointmentsPDF = async function() {
  toast('Preparing appointments PDF…', 'info');
  const phpOk = await tryPhpPDF({ type: 'all_appointments' });
  if (!phpOk) {
    toast('Generating PDF…', 'info');
    downloadAppointmentsPDF_JS();
  }
};

// ── Download single appointment ───────────────────────
window.downloadSingleApptPDF = async function(a) {
  toast('Preparing appointment PDF…', 'info');
  let phpOk = false;
  if (a.id && String(a.id).match(/^\d+$/)) {
    phpOk = await tryPhpPDF({ type: 'appointment', id: a.id });
  }
  if (!phpOk) {
    toast('Generating PDF…', 'info');
    downloadSingleApptPDF_JS(a);
  }
};

// ── jsPDF helpers (fallback when PHP unavailable) ────
function getPDF() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ unit: 'mm', format: 'a4' });
}
function pdfHeader(doc) {
  const user = getSession();
  // Blue header bar
  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, 210, 28, 'F');
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MedCare Clinic', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Health Avenue, Medical City  |  +1 (800) 123-4567  |  info@medcareclinic.com', 14, 21);
  // Patient name top right
  if (user) {
    doc.setFontSize(9);
    doc.text('Patient: ' + user.first + ' ' + user.last, 196, 13, { align: 'right' });
    doc.text(user.email, 196, 21, { align: 'right' });
  }
  // Reset color
  doc.setTextColor(26, 26, 46);
}

// ── CLINIC FOOTER ─────────────────────────────────────
function pdfFooter(doc, pageNum, totalPages) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageH - 16, 196, pageH - 16);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('MedCare Clinic — Confidential Medical Document', 14, pageH - 10);
  doc.text('Page ' + pageNum + ' of ' + totalPages, 196, pageH - 10, { align: 'right' });
  doc.text('Generated: ' + new Date().toLocaleString(), 105, pageH - 10, { align: 'center' });
  doc.setTextColor(26, 26, 46);
}

// ── SECTION DIVIDER ───────────────────────────────────
function pdfSection(doc, label, y) {
  doc.setFillColor(239, 246, 255);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 115, 232);
  doc.text(label, 17, y + 5.5);
  doc.setTextColor(26, 26, 46);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

// ── ROW ───────────────────────────────────────────────
function pdfRow(doc, label, value, y, shade) {
  if (shade) { doc.setFillColor(248, 250, 252); doc.rect(14, y, 182, 8, 'F'); }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(label, 17, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 26, 46);
  doc.text(String(value || '—'), 75, y + 5.5);
  return y + 8;
}

// ════════════════════════════════════════════════════
//  DOWNLOAD A SINGLE RECORD PDF
// ════════════════════════════════════════════════════
window.downloadRecordPDF_JS = function(record) {
  const user = getSession();
  const doc  = getPDF();

  pdfHeader(doc);

  let y = 36;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 46);
  doc.text(record.title, 14, y);
  y += 8;

  // Status badge
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(14, y, 36, 7, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('OFFICIAL RECORD', 17, y + 5);
  doc.setTextColor(26, 26, 46);
  y += 14;

  // Patient info section
  y = pdfSection(doc, 'Patient Information', y);
  if (user) {
    y = pdfRow(doc, 'Full Name',    user.first + ' ' + user.last, y, false);
    y = pdfRow(doc, 'Email',        user.email,                   y, true);
    y = pdfRow(doc, 'Phone',        user.phone || '—',            y, false);
    y = pdfRow(doc, 'Blood Type',   user.blood || '—',            y, true);
  }
  y += 4;

  // Record info section
  y = pdfSection(doc, 'Record Information', y);
  y = pdfRow(doc, 'Record Type',   record.type,   y, false);
  y = pdfRow(doc, 'Date',          record.date,   y, true);
  y = pdfRow(doc, 'Physician',     record.doctor, y, false);
  y = pdfRow(doc, 'Facility',      'MedCare Clinic', y, true);
  y += 4;

  // Details section
  y = pdfSection(doc, 'Clinical Details / Findings', y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const lines = record.details.split('\n');
  lines.forEach((line, i) => {
    if (y > 265) {
      doc.addPage();
      pdfHeader(doc);
      y = 36;
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }
    // Bold label if line has colon
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1 && colonIdx < 30) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text(line.substring(0, colonIdx + 1), 17, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(line.substring(colonIdx + 1).trim(), 75, y + 5);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const wrapped = doc.splitTextToSize(line, 175);
      doc.text(wrapped, 17, y + 5);
      y += (wrapped.length - 1) * 5;
    }
    y += 7;
  });

  y += 6;
  // Disclaimer box
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISCLAIMER', 17, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('This document is confidential and intended solely for the named patient. Do not share without authorization.', 17, y + 12, { maxWidth: 178 });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    pdfFooter(doc, i, totalPages);
  }

  doc.save('MedCare_' + record.title.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0,10) + '.pdf');
};

// ════════════════════════════════════════════════════
//  DOWNLOAD ALL RECORDS AS ONE PDF
// ════════════════════════════════════════════════════
const ALL_RECORDS = [
  { title:'Blood Test Results',  type:'Lab Report',     date:'Jun 2026', doctor:'Dr. Sarah Johnson',   details:'WBC: 6.5 k/uL (Normal)\nRBC: 4.8 M/uL (Normal)\nHemoglobin: 14.2 g/dL (Normal)\nHematocrit: 42% (Normal)\nPlatelets: 250 k/uL (Normal)\nGlucose: 92 mg/dL (Normal)\nCholesterol: 185 mg/dL (Normal)' },
  { title:'ECG Report',          type:'Cardiology',     date:'May 2026', doctor:'Dr. Sarah Johnson',   details:'Heart Rate: 72 bpm (Normal)\nRhythm: Normal sinus rhythm\nPR Interval: 160 ms (Normal)\nQRS Duration: 88 ms (Normal)\nQT Interval: 400 ms (Normal)\nConclusion: No significant abnormalities detected.' },
  { title:'Prescription',        type:'General',        date:'Apr 2026', doctor:'Dr. Michael Chen',    details:'Amoxicillin 500mg: 3x daily for 7 days\nIbuprofen 400mg: as needed for pain\nVitamin D3 1000 IU: once daily\nInstructions: Take with food. Complete full course of antibiotics.' },
  { title:'Chest X-Ray Report',  type:'Radiology',      date:'Mar 2026', doctor:'Dr. Emily Rodriguez', details:'Technique: PA and lateral views\nLungs: Clear, no infiltrates\nHeart Size: Normal\nMediastinum: Normal width\nBones: No fractures\nImpression: Normal chest X-ray. No acute findings.' },
];

window.downloadAllRecordsPDF_JS = function() {
  const user = getSession();
  const doc  = getPDF();
  pdfHeader(doc);

  let y = 36;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Medical Records', 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('All records on file · ' + new Date().toLocaleDateString(), 14, y);
  doc.setTextColor(26, 26, 46);
  y += 10;

  ALL_RECORDS.forEach((rec, idx) => {
    if (y > 240) { doc.addPage(); pdfHeader(doc); y = 36; }
    y = pdfSection(doc, (idx + 1) + '. ' + rec.title + '  (' + rec.type + ' · ' + rec.date + ')', y);
    y = pdfRow(doc, 'Physician', rec.doctor, y, false);
    y += 2;
    const lines = rec.details.split('\n');
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); pdfHeader(doc); y = 36; }
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1 && colonIdx < 30) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 115, 232);
        doc.setFontSize(9);
        doc.text(line.substring(0, colonIdx + 1), 17, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
        doc.text(line.substring(colonIdx + 1).trim(), 75, y);
      } else {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
        doc.text(line, 17, y);
      }
      y += 6;
    });
    y += 6;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); pdfFooter(doc, i, totalPages); }
  doc.save('MedCare_All_Records_' + new Date().toISOString().slice(0,10) + '.pdf');
};

// ════════════════════════════════════════════════════
//  DOWNLOAD APPOINTMENTS PDF
// ════════════════════════════════════════════════════
window.downloadAppointmentsPDF_JS = function() {
  const user  = getSession();
  if (!user) return;
  const appts = getAppts().filter(a => a.email === user.email);
  const doc   = getPDF();
  pdfHeader(doc);

  let y = 36;
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Appointment History', 14, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(user.first + ' ' + user.last + '  ·  ' + appts.length + ' appointment(s)', 14, y);
  doc.setTextColor(26, 26, 46); y += 12;

  if (!appts.length) {
    doc.setFontSize(11); doc.setTextColor(148, 163, 184);
    doc.text('No appointments found.', 14, y);
  } else {
    // Table header
    doc.setFillColor(26, 115, 232);
    doc.rect(14, y, 182, 9, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255);
    doc.text('Department',  17,  y + 6);
    doc.text('Doctor',      65,  y + 6);
    doc.text('Date & Time', 110, y + 6);
    doc.text('Type',        155, y + 6);
    doc.text('Status',      178, y + 6);
    y += 9;

    appts.sort((a,b) => new Date(b.date||b.appointment_date) - new Date(a.date||a.appointment_date))
      .forEach((a, i) => {
        if (y > 270) { doc.addPage(); pdfHeader(doc); y = 36; }
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, 182, 9, 'F'); }
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 46);
        doc.text((a.department   || '—').substring(0, 18),  17,  y + 6);
        doc.text((a.doctor       || 'TBD').substring(0,16), 65,  y + 6);
        doc.text((a.date||a.appointment_date||'—') + ' ' + (a.time||a.appointment_time||''), 110, y + 6);
        doc.text((a.type||a.visit_type||'—').substring(0,10), 155, y + 6);

        // Colored status
        const sc = { pending:{r:254,g:243,b:199}, confirmed:{r:209,g:250,b:229}, completed:{r:224,g:242,b:254}, cancelled:{r:254,g:226,b:226} };
        const tc = { pending:[146,64,14], confirmed:[22,101,52], completed:[12,74,110], cancelled:[153,27,27] };
        const s  = (a.status || 'pending').toLowerCase();
        if (sc[s]) { doc.setFillColor(sc[s].r, sc[s].g, sc[s].b); doc.roundedRect(176, y+1, 18, 6, 1, 1, 'F'); }
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(tc[s] || [26,26,46]));
        doc.text(s.toUpperCase(), 177, y + 6);
        doc.setTextColor(26, 26, 46); doc.setFont('helvetica', 'normal');
        y += 9;
    });
  }

  // Also add patient profile at end
  if (user) {
    y += 8;
    if (y > 240) { doc.addPage(); pdfHeader(doc); y = 36; }
    y = pdfSection(doc, 'Patient Profile', y);
    y = pdfRow(doc, 'Full Name',  user.first + ' ' + user.last, y, false);
    y = pdfRow(doc, 'Email',      user.email,     y, true);
    y = pdfRow(doc, 'Phone',      user.phone||'—', y, false);
    y = pdfRow(doc, 'Blood Type', user.blood||'—', y, true);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); pdfFooter(doc, i, totalPages); }
  doc.save('MedCare_Appointments_' + user.first + '_' + new Date().toISOString().slice(0,10) + '.pdf');
};

// Load appointment summary list when records tab is opened
(function() {
  const origSwitch = switchSec;
  window.switchSec = function(id) {
    origSwitch(id);
    if (id === 'records') {
      const user  = getSession();
      const appts = user ? getAppts().filter(a => a.email === user.email) : [];
      const el    = document.getElementById('apptSummaryList');
      if (!el) return;
      el.innerHTML = appts.length
        ? appts.slice(0,5).map(a => `
            <div class="appt-card">
              <div class="appt-card-icon"><i class="fa fa-calendar-check"></i></div>
              <div class="appt-card-info">
                <strong>${a.department}</strong>
                <span>${a.doctor||'TBD'} · ${a.date||a.appointment_date} · ${a.status}</span>
              </div>
              <button class="btn btn-sm" onclick='downloadSingleApptPDF(${JSON.stringify(a)})'>
                <i class="fa fa-download"></i> PDF
              </button>
            </div>`).join('')
        : '<p style="color:#94a3b8;font-size:.88rem">No appointments to export.</p>';
    }
  };
})();

// ── Single appointment PDF ────────────────────────────
window.downloadSingleApptPDF_JS = function(a) {
  const user = getSession();
  const doc  = getPDF();
  pdfHeader(doc);

  let y = 36;
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Appointment Summary', 14, y); y += 8;

  const s  = (a.status||'pending').toLowerCase();
  const fc = { pending:[254,243,199], confirmed:[209,250,229], completed:[224,242,254], cancelled:[254,226,226] };
  const tc = { pending:[146,64,14],   confirmed:[22,101,52],   completed:[12,74,110],  cancelled:[153,27,27] };
  const fArr = fc[s] || [240,240,240];
  doc.setFillColor(...fArr);
  doc.roundedRect(14, y, 40, 8, 2, 2, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(tc[s]||[26,26,46]));
  doc.text(s.toUpperCase(), 16, y + 5.5);
  doc.setTextColor(26, 26, 46); y += 14;

  y = pdfSection(doc, 'Patient Information', y);
  if (user) {
    y = pdfRow(doc, 'Full Name',  user.first + ' ' + user.last, y, false);
    y = pdfRow(doc, 'Email',      user.email,     y, true);
    y = pdfRow(doc, 'Phone',      user.phone||'—', y, false);
  }
  y += 4;

  y = pdfSection(doc, 'Appointment Details', y);
  y = pdfRow(doc, 'Department',  a.department||'—',                    y, false);
  y = pdfRow(doc, 'Doctor',      a.doctor||'Any Available',            y, true);
  y = pdfRow(doc, 'Date',        a.date||a.appointment_date||'—',      y, false);
  y = pdfRow(doc, 'Time',        a.time||a.appointment_time||'—',      y, true);
  y = pdfRow(doc, 'Visit Type',  a.type||a.visit_type||'In-Person',    y, false);
  y = pdfRow(doc, 'Status',      s,                                    y, true);
  if (a.symptoms) { y += 4; y = pdfRow(doc, 'Symptoms', a.symptoms, y, false); }
  if (a.id) { y += 4; y = pdfRow(doc, 'Reference', String(a.id), y, true); }

  y += 8;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y, 182, 14, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(26, 115, 232); doc.setFont('helvetica', 'bold');
  doc.text('MedCare Clinic', 17, y + 5.5);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('123 Health Avenue, Medical City  |  +1 (800) 123-4567  |  info@medcareclinic.com', 17, y + 11);

  pdfFooter(doc, 1, 1);
  doc.save('MedCare_Appt_' + (a.department||'').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.pdf');
};
