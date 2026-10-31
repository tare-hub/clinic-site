// ════════════════════════════════════════════════════
//  MEDCARE — AUTH PAGE (login.html)
// ════════════════════════════════════════════════════

const getUsers  = () => JSON.parse(localStorage.getItem("clinic_users") || "[]");
const saveUsers = u  => localStorage.setItem("clinic_users", JSON.stringify(u));
const setSession= u  => sessionStorage.setItem("clinic_user", JSON.stringify(u));
const getSession= () => JSON.parse(sessionStorage.getItem("clinic_user") || "null");

// Redirect if already logged in
if (getSession()) window.location.href = "dashboard.html";

// ── TAB SWITCHING ─────────────────────────────────────
window.switchTab = function(id) {
  document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".atab").forEach(b => b.classList.remove("active"));
  const panel = document.getElementById(id);
  if (panel) panel.classList.add("active");
  const tab = document.querySelector(`.atab[data-tab="${id}"]`);
  if (tab) tab.classList.add("active");
};

document.querySelectorAll(".atab").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Forgot password link
document.getElementById("forgotLink")?.addEventListener("click", e => {
  e.preventDefault();
  switchTab("forgotPanel");
});

// ── PASSWORD VISIBILITY ───────────────────────────────
document.querySelectorAll(".pw-eye").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.for);
    if (!input) return;
    const show = input.type === "password";
    input.type      = show ? "text" : "password";
    btn.innerHTML   = show ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
  });
});

// ── PASSWORD STRENGTH ──────────────────────────────────
document.getElementById("regPassword")?.addEventListener("input", function() {
  const v    = this.value;
  const fill = document.getElementById("strengthFill");
  const text = document.getElementById("strengthText");
  let score = 0;
  if (v.length >= 6)           score++;
  if (v.length >= 10)          score++;
  if (/[A-Z]/.test(v))         score++;
  if (/[0-9]/.test(v))         score++;
  if (/[^A-Za-z0-9]/.test(v))  score++;
  const levels = [
    { pct:"0%",   color:"#e2e8f0", label:"" },
    { pct:"20%",  color:"#ef4444", label:"Very weak" },
    { pct:"40%",  color:"#f97316", label:"Weak" },
    { pct:"60%",  color:"#eab308", label:"Fair" },
    { pct:"80%",  color:"#22c55e", label:"Strong" },
    { pct:"100%", color:"#16a34a", label:"Very strong" },
  ];
  const lvl = levels[score] || levels[0];
  if (fill) { fill.style.width = lvl.pct; fill.style.background = lvl.color; }
  if (text) { text.textContent = lvl.label; text.style.color = lvl.color; }
});

// ── REGISTER ─────────────────────────────────────────
document.getElementById("registerForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const first  = document.getElementById("regFirst").value.trim();
  const last   = document.getElementById("regLast").value.trim();
  const email  = document.getElementById("regEmail").value.trim().toLowerCase();
  const phone  = document.getElementById("regPhone").value.trim();
  const pass   = document.getElementById("regPassword").value;
  const confirm= document.getElementById("regConfirm").value;
  const msg    = document.getElementById("registerMsg");
  const btn    = document.getElementById("registerBtn");

  msg.textContent = ""; msg.className = "form-msg";

  if (!first || !last || !email || !pass) return setMsg(msg, "Please fill all required fields.", "error");
  if (!/\S+@\S+\.\S+/.test(email))        return setMsg(msg, "Please enter a valid email address.", "error");
  if (pass.length < 6)                    return setMsg(msg, "Password must be at least 6 characters.", "error");
  if (pass !== confirm)                   return setMsg(msg, "Passwords do not match.", "error");

  btn.disabled = true;
  btn.querySelector("span").textContent = "Creating account…";

  // Try PHP backend
  try {
    const fd = new FormData();
    fd.append("first", first); fd.append("last", last);
    fd.append("email", email); fd.append("phone", phone); fd.append("password", pass);
    const res  = await fetch("api/auth.php?action=register", { method:"POST", body:fd });
    const json = await res.json();
    if (json.success) {
      setSession(json.user);
      toast("✅ Account created! Welcome, " + first + ".", "success");
      setTimeout(() => window.location.href = "dashboard.html", 900);
      return;
    } else {
      setMsg(msg, json.message, "error");
      btn.disabled = false;
      btn.querySelector("span").textContent = "Create Account";
      return;
    }
  } catch { /* use localStorage */ }

  // localStorage fallback
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    setMsg(msg, "An account with this email already exists.", "error");
    btn.disabled = false;
    btn.querySelector("span").textContent = "Create Account";
    return;
  }

  const user = { id: Date.now(), first, last, email, phone, password: pass, createdAt: new Date().toLocaleDateString() };
  users.push(user);
  saveUsers(users);
  setSession(user);
  toast("✅ Account created! Welcome, " + first + ".", "success");
  setTimeout(() => window.location.href = "dashboard.html", 900);
});

// ── LOGIN ─────────────────────────────────────────────
document.getElementById("loginForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("loginPassword").value;
  const msg   = document.getElementById("loginMsg");
  const btn   = document.getElementById("loginBtn");
  const remember = document.getElementById("rememberMe")?.checked;

  msg.textContent = ""; msg.className = "form-msg";

  // Inline validation
  let valid = true;
  if (!email) { document.getElementById("emailErr").textContent = "Email is required."; valid = false; }
  else if (!/\S+@\S+\.\S+/.test(email)) { document.getElementById("emailErr").textContent = "Enter a valid email."; valid = false; }
  else document.getElementById("emailErr").textContent = "";
  if (!pass) { document.getElementById("passErr").textContent = "Password is required."; valid = false; }
  else document.getElementById("passErr").textContent = "";
  if (!valid) return;

  btn.disabled = true;
  btn.querySelector("span").textContent = "Signing in…";

  // Try PHP
  try {
    const fd = new FormData();
    fd.append("email", email); fd.append("password", pass);
    const res  = await fetch("api/auth.php?action=login", { method:"POST", body:fd });
    const json = await res.json();
    if (json.success) {
      if (remember) localStorage.setItem("clinic_remember", email);
      setSession(json.user);
      toast("✅ Welcome back, " + json.user.first + "!", "success");
      setTimeout(() => window.location.href = "dashboard.html", 700);
      return;
    } else {
      setMsg(msg, json.message || "Incorrect email or password.", "error");
      btn.disabled = false;
      btn.querySelector("span").textContent = "Sign In";
      return;
    }
  } catch { /* localStorage fallback */ }

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === pass);
  if (!user) {
    setMsg(msg, "Incorrect email or password.", "error");
    btn.disabled = false;
    btn.querySelector("span").textContent = "Sign In";
    return;
  }

  if (remember) localStorage.setItem("clinic_remember", email);
  setSession(user);
  toast("✅ Welcome back, " + user.first + "!", "success");
  setTimeout(() => window.location.href = "dashboard.html", 700);
});

// Auto-fill remembered email
const remembered = localStorage.getItem("clinic_remember");
if (remembered) {
  const emailInput = document.getElementById("loginEmail");
  if (emailInput) { emailInput.value = remembered; document.getElementById("rememberMe").checked = true; }
}

// ── FORGOT PASSWORD ────────────────────────────────────
document.getElementById("forgotForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
  const newPw = document.getElementById("forgotNew").value;
  const conf  = document.getElementById("forgotConfirm").value;
  const msg   = document.getElementById("forgotMsg");

  if (!email || !newPw || !conf)  return setMsg(msg, "Please fill all fields.", "error");
  if (newPw.length < 6)           return setMsg(msg, "Password must be at least 6 characters.", "error");
  if (newPw !== conf)             return setMsg(msg, "Passwords do not match.", "error");

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === email);
  if (idx === -1) return setMsg(msg, "No account found with that email.", "error");

  users[idx].password = newPw;
  saveUsers(users);
  setMsg(msg, "✅ Password reset! You can now sign in.", "success");
  setTimeout(() => switchTab("loginPanel"), 1800);
});

// ── HELPERS ───────────────────────────────────────────
function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className   = "form-msg " + type;
}

function toast(msg, type = "info") {
  let c = document.getElementById("toastContainer");
  if (!c) return;
  const t = document.createElement("div");
  t.className = "toast-msg " + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4000);
}
