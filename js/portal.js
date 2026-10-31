// ════════════════════════════════════════════════════
//  PATIENT PORTAL — FUNCTIONAL LOGIN & DASHBOARD
// ════════════════════════════════════════════════════

// ── STORAGE ──────────────────────────────────────────
const getUsers   = () => JSON.parse(localStorage.getItem("clinic_users") || "[]");
const saveUsers  = u  => localStorage.setItem("clinic_users", JSON.stringify(u));
const getSession = () => JSON.parse(sessionStorage.getItem("clinic_user") || "null");
const setSession = u  => sessionStorage.setItem("clinic_user", JSON.stringify(u));
const getAppts   = () => JSON.parse(localStorage.getItem("clinic_appts")  || "[]");

// ── DOM REFS ──────────────────────────────────────────
const gate      = document.getElementById("portalGate");
const dashboard = document.getElementById("portalDashboard");

// ── SHOW / HIDE HELPER ────────────────────────────────
function show(el)  { if (el) { el.style.display = ""; el.classList.remove("hidden"); } }
function hide(el)  { if (el) el.classList.add("hidden"); }
function showDashboard(user) { hide(gate); show(dashboard); populateDashboard(user); }
function showGate()          { hide(dashboard); show(gate); }

// ── TAB SWITCHING ─────────────────────────────────────
window.switchTab = function(id) {
  document.querySelectorAll(".portal-form").forEach(f => {
    f.style.display = (f.id === id) ? "block" : "none";
  });
  document.querySelectorAll(".ptab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === id);
  });
};

// Init: show login tab by default
document.querySelectorAll(".portal-form").forEach(f => { f.style.display = "none"; });
const loginTab = document.getElementById("loginTab");
if (loginTab) loginTab.style.display = "block";

document.querySelectorAll(".ptab").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ── PASSWORD STRENGTH ──────────────────────────────────
document.getElementById("regPassword")?.addEventListener("input", function () {
  const fill = document.getElementById("strengthFill");
  if (!fill) return;
  const v = this.value;
  let s = 0;
  if (v.length >= 6)           s++;
  if (v.length >= 10)          s++;
  if (/[A-Z]/.test(v))         s++;
  if (/[0-9]/.test(v))         s++;
  if (/[^A-Za-z0-9]/.test(v))  s++;
  const colors = ["#eee", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1b5e20"];
  fill.style.width      = s * 20 + "%";
  fill.style.background = colors[s];
});

// ── REGISTER ─────────────────────────────────────────
document.getElementById("registerForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const first = document.getElementById("regFirst").value.trim();
  const last  = document.getElementById("regLast").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const phone = document.getElementById("regPhone").value.trim();
  const pass  = document.getElementById("regPassword").value;
  const msg   = document.getElementById("registerMsg");

  if (!first || !last || !email || !pass) return setMsg(msg, "Please fill all required fields.", "error");
  if (!/\S+@\S+\.\S+/.test(email))        return setMsg(msg, "Please enter a valid email.", "error");
  if (pass.length < 6)                    return setMsg(msg, "Password must be at least 6 characters.", "error");

  const users = getUsers();
  if (users.find(u => u.email === email)) return setMsg(msg, "An account with this email already exists.", "error");

  const user = { id: Date.now(), first, last, email, phone, password: pass, createdAt: new Date().toLocaleDateString() };
  users.push(user);
  saveUsers(users);
  setSession(user);
  setMsg(msg, "✅ Account created! Welcome, " + first + ".", "success");
  setTimeout(() => showDashboard(user), 700);
});

// ── LOGIN ─────────────────────────────────────────────
document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("loginPassword").value;
  const msg   = document.getElementById("loginMsg");
  const btn   = this.querySelector("button[type=submit]");

  if (!email || !pass) return setMsg(msg, "Please enter your email and password.", "error");

  btn.disabled    = true;
  btn.textContent = "Signing in…";

  // Try PHP backend
  try {
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", pass);
    const res  = await fetch("api/auth.php?action=login", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) {
      setSession(json.user);
      showDashboard(json.user);
      return;
    } else {
      setMsg(msg, json.message || "Incorrect email or password.", "error");
      btn.disabled    = false;
      btn.innerHTML   = "Sign In";
      return;
    }
  } catch { /* PHP not available — use localStorage */ }

  // localStorage fallback
  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === pass);

  if (!user) {
    setMsg(msg, "Incorrect email or password.", "error");
    btn.disabled  = false;
    btn.innerHTML = "Sign In";
    return;
  }

  setSession(user);
  showDashboard(user);
});

// Toggle password visibility
(function () {
  const addToggle = (inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const wrap = input.parentElement;
    const btn  = document.createElement("button");
    btn.type      = "button";
    btn.className = "pw-toggle";
    btn.innerHTML = '<i class="fa fa-eye"></i>';
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type        = show ? "text" : "password";
      btn.innerHTML     = show ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
    });
    wrap.style.position = "relative";
    wrap.appendChild(btn);
  };
  addToggle("loginPassword");
  addToggle("regPassword");
})();

// ── LOGOUT ────────────────────────────────────────────
document.getElementById("portalLogout")?.addEventListener("click", () => {
  sessionStorage.removeItem("clinic_user");
  showGate();
  switchTab("loginTab");
});

// ── POPULATE DASHBOARD ────────────────────────────────
function populateDashboard(user) {
  document.getElementById("dashName").textContent    = user.first + " " + user.last;
  document.getElementById("dashEmail").textContent   = user.email;
  document.getElementById("welcomeName").textContent = user.first;
  loadAppointments(user);
  fillProfile(user);
}

// ── APPOINTMENTS ──────────────────────────────────────
function loadAppointments(user) {
  const all      = getAppts();
  const mine     = all.filter(a => a.email === user.email);
  const today    = new Date(); today.setHours(0,0,0,0);
  const upcoming = mine.filter(a => new Date(a.date || a.appointment_date) >= today);

  document.getElementById("totalAppts").textContent    = mine.length;
  document.getElementById("upcomingAppts").textContent = upcoming.length;

  // Next appointment card
  const next = upcoming.sort((a,b) => new Date(a.date||a.appointment_date) - new Date(b.date||b.appointment_date))[0];
  document.getElementById("nextAppt").innerHTML = next
    ? `<div class="appt-item">
        <i class="fa fa-calendar-check"></i>
        <div class="appt-item-info">
          <strong>${next.department}</strong>
          <span>${next.doctor || "Doctor TBD"} &nbsp;·&nbsp; ${next.date||next.appointment_date} at ${next.time||next.appointment_time}</span>
        </div>
        <span class="appt-badge ${next.status}">${next.status}</span>
      </div>`
    : `<p style="color:#94a3b8;font-size:.88rem">No upcoming appointments. <a href="appointment.html" style="color:var(--primary)">Book one now →</a></p>`;

  // Full list
  const listEl  = document.getElementById("apptList");
  const sorted  = mine.sort((a,b) => new Date(b.date||b.appointment_date) - new Date(a.date||a.appointment_date));
  listEl.innerHTML = sorted.length
    ? sorted.map((a, i) => {
            const canCancel = a.status === "pending" || a.status === "confirmed";
            const apptKey   = a.id || i;
            return `
            <div class="appt-item" id="appt_${apptKey}">
              <i class="fa fa-hospital"></i>
              <div class="appt-item-info">
                <strong>${a.department}</strong>
                <span>${a.doctor||"TBD"} &nbsp;·&nbsp; ${a.date||a.appointment_date} at ${a.time||a.appointment_time} &nbsp;·&nbsp; ${a.type||a.visit_type||"In-Person"}</span>
              </div>
              <div class="appt-actions">
                <span class="appt-badge ${a.status}">${a.status}</span>
                ${canCancel ? `<button class="cancel-appt-btn" onclick="cancelAppt('${apptKey}','${a.email}')">Cancel</button>` : ""}
              </div>
            </div>`;
          }).join("")
    : `<div class="empty-state"><i class="fa fa-calendar"></i><p>No appointments yet.</p><a href="appointment.html" class="btn btn-primary btn-sm">Book your first appointment</a></div>`;
}

// ── PROFILE ───────────────────────────────────────────
function fillProfile(user) {
  document.getElementById("profFirst").value  = user.first  || "";
  document.getElementById("profLast").value   = user.last   || "";
  document.getElementById("profEmail").value  = user.email  || "";
  document.getElementById("profPhone").value  = user.phone  || "";
  document.getElementById("profDob").value    = user.dob    || "";
  const bloodEl = document.getElementById("profBlood");
  if (bloodEl && user.blood) bloodEl.value = user.blood;
}

document.getElementById("profileForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const user  = getSession();
  if (!user) return;
  const msg   = document.getElementById("profMsg");

  user.first  = document.getElementById("profFirst").value.trim();
  user.last   = document.getElementById("profLast").value.trim();
  user.phone  = document.getElementById("profPhone").value.trim();
  user.dob    = document.getElementById("profDob").value;
  user.blood  = document.getElementById("profBlood").value;

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === user.email);
  if (idx > -1) { Object.assign(users[idx], user); saveUsers(users); }
  setSession(user);
  document.getElementById("dashName").textContent = user.first + " " + user.last;
  setMsg(msg, "✅ Profile saved successfully!", "success");
});
// ── SIDEBAR NAV ───────────────────────────────────────
document.querySelectorAll(".dnl").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".dnl").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".dash-sec").forEach(s => s.classList.remove("active"));
    link.classList.add("active");
    const secId = "sec" + link.dataset.sec.charAt(0).toUpperCase() + link.dataset.sec.slice(1);
    document.getElementById(secId)?.classList.add("active");
    // Reload appointments when tab opened
    if (link.dataset.sec === "appointments" || link.dataset.sec === "overview") {
      const user = getSession();
      if (user) loadAppointments(user);
    }
  });
});

// ── MSG HELPER ────────────────────────────────────────
function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className   = "form-msg " + type;
}

// ── TOAST ─────────────────────────────────────────────
function toast(msg, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = "toast-msg " + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4000);
}

// ── AUTO-LOGIN ────────────────────────────────────────
const existingSession = getSession();
if (existingSession) {
  showDashboard(existingSession);
} else {
  showGate();
}

// ── CANCEL APPOINTMENT ────────────────────────────────
const saveAppts = d => localStorage.setItem("clinic_appts", JSON.stringify(d));

window.cancelAppt = function(apptKey, email) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return;
  const appts = getAppts();

  // Find by id first, then by index key, then by email+cancellable status
  let target = appts.findIndex(a => String(a.id) === String(apptKey));
  if (target === -1) {
    // id was generated as email_index during render
    const parts = String(apptKey).split("_");
    const idx   = parseInt(parts[parts.length - 1]);
    if (!isNaN(idx) && appts[idx] && appts[idx].email === email) target = idx;
  }
  if (target === -1) {
    target = appts.findIndex(a => a.email === email && (a.status === "pending" || a.status === "confirmed"));
  }

  if (target > -1) {
    appts[target].status = "cancelled";
    saveAppts(appts);
    toast("Appointment cancelled successfully.", "info");
    const user = getSession();
    if (user) loadAppointments(user);
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────
document.getElementById("changePwBtn")?.addEventListener("click", () => {
  const user    = getSession();
  if (!user) return;
  const current = document.getElementById("pwCurrent").value;
  const newPw   = document.getElementById("pwNew").value;
  const confirm = document.getElementById("pwConfirm").value;
  const msg     = document.getElementById("pwMsg");

  if (!current || !newPw || !confirm) return setMsg(msg, "Please fill all password fields.", "error");

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
  document.getElementById("pwCurrent").value = "";
  document.getElementById("pwNew").value     = "";
  document.getElementById("pwConfirm").value = "";
  setMsg(msg, "✅ Password updated successfully!", "success");
  toast("Password changed successfully.", "success");
});
