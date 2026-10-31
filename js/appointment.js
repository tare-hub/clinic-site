// ════════════════════════════════════════════════════
//  APPOINTMENT BOOKING — with EmailJS fallback
// ════════════════════════════════════════════════════

// ── EMAILJS CONFIG ────────────────────────────────────
// Sign up free at https://www.emailjs.com/
// Replace these values with your own:
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";       // Account → API Keys
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";       // Email Services → Service ID
const EMAILJS_PATIENT_TPL = "template_patient_appt"; // Template ID for patient email
const EMAILJS_ADMIN_TPL   = "template_admin_appt";   // Template ID for admin email
const ADMIN_EMAIL_JS      = "meserettariku921@gmail.com";

// Initialize EmailJS
if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ── FORM SUBMIT ───────────────────────────────────────
document.getElementById("appointmentForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const msg = document.getElementById("apptMsg");
  const btn = this.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';

  const data = new FormData(this);
  const apptRef = "APT-" + Date.now().toString().slice(-6);

  // Collect form fields for EmailJS
  const fields = {
    patient_name   : (data.get("first_name") || "") + " " + (data.get("last_name") || ""),
    patient_email  : data.get("email")            || "",
    patient_phone  : data.get("phone")            || "",
    department     : data.get("department")       || "",
    doctor         : data.get("doctor")           || "Any Available",
    appt_date      : data.get("appointment_date") || "",
    appt_time      : data.get("appointment_time") || "",
    visit_type     : data.get("visit_type")       || "In-Person",
    symptoms       : data.get("symptoms")         || "—",
    reference      : apptRef,
    admin_email    : ADMIN_EMAIL_JS,
    site_url       : window.location.origin,
  };

  // ── Try PHP backend first ─────────────────────────
  try {
    const res  = await fetch("api/appointment.php", { method: "POST", body: data });
    const json = await res.json();

    if (json.success) {
      saveLocalAppt(data, json.appointment_id || apptRef);
      showMsg(msg, "✅ " + json.message, "success");
      this.reset();
      btn.disabled    = false;
      btn.innerHTML   = '<i class="fa fa-calendar-check"></i> Confirm Appointment';
      setTimeout(() => window.location.href = "dashboard.html", 2500);
      return;
    } else {
      showMsg(msg, json.message, "error");
      btn.disabled  = false;
      btn.innerHTML = '<i class="fa fa-calendar-check"></i> Confirm Appointment';
      return;
    }
  } catch { /* PHP not available — use EmailJS */ }

  // ── EmailJS fallback ──────────────────────────────
  if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    try {
      // 1. Confirmation to patient
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PATIENT_TPL, {
        to_email   : fields.patient_email,
        to_name    : fields.patient_name,
        department : fields.department,
        doctor     : fields.doctor,
        appt_date  : fields.appt_date,
        appt_time  : fields.appt_time,
        visit_type : fields.visit_type,
        reference  : fields.reference,
        site_url   : fields.site_url,
      });

      // 2. Notification to meserettariku921@gmail.com
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TPL, {
        to_email      : ADMIN_EMAIL_JS,
        patient_name  : fields.patient_name,
        patient_email : fields.patient_email,
        patient_phone : fields.patient_phone,
        department    : fields.department,
        doctor        : fields.doctor,
        appt_date     : fields.appt_date,
        appt_time     : fields.appt_time,
        visit_type    : fields.visit_type,
        symptoms      : fields.symptoms,
        reference     : fields.reference,
        reply_to      : fields.patient_email,
      });

      saveLocalAppt(data, apptRef);
      showMsg(msg, "✅ Appointment booked! Confirmation sent to " + fields.patient_email, "success");
      this.reset();
      setTimeout(() => window.location.href = "dashboard.html", 2500);

    } catch (err) {
      console.error("EmailJS error:", err);
      // Save locally even if email fails
      saveLocalAppt(data, apptRef);
      showMsg(msg, "✅ Appointment saved (Ref: " + apptRef + "). Email delivery requires server setup.", "success");
      this.reset();
      setTimeout(() => window.location.href = "dashboard.html", 2500);
    }
  } else {
    // No EmailJS configured — save locally only
    saveLocalAppt(data, apptRef);
    showMsg(msg, "✅ Appointment saved! Ref: " + apptRef + ". To enable email, configure EmailJS in js/appointment.js.", "success");
    this.reset();
    setTimeout(() => window.location.href = "dashboard.html", 2500);
  }

  btn.disabled  = false;
  btn.innerHTML = '<i class="fa fa-calendar-check"></i> Confirm Appointment';
});

// ── Save to localStorage ──────────────────────────────
function saveLocalAppt(data, id) {
  const appts = JSON.parse(localStorage.getItem("clinic_appts") || "[]");
  appts.unshift({
    id           : id,
    name         : (data.get("first_name") || "") + " " + (data.get("last_name") || ""),
    email        : data.get("email")             || "",
    phone        : data.get("phone")             || "",
    department   : data.get("department")        || "",
    doctor       : data.get("doctor")            || "Any Available",
    date         : data.get("appointment_date")  || "",
    time         : data.get("appointment_time")  || "",
    type         : data.get("visit_type")        || "in-person",
    symptoms     : data.get("symptoms")          || "",
    status       : "pending",
    createdAt    : new Date().toLocaleDateString(),
  });
  localStorage.setItem("clinic_appts", JSON.stringify(appts));
}

// ── Msg helper ────────────────────────────────────────
function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className   = "form-msg " + type;
}
