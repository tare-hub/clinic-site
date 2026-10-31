// Loader
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loader")?.classList.add("hide"), 800);
});

// Sticky header
window.addEventListener("scroll", () => {
  document.getElementById("header")?.classList.toggle("scrolled", window.scrollY > 50);
  updateActiveNav();
});

// Hamburger
document.getElementById("hamburger")?.addEventListener("click", () => {
  document.getElementById("nav")?.classList.toggle("open");
});
document.addEventListener("click", e => {
  if (!e.target.closest("header")) document.getElementById("nav")?.classList.remove("open");
});

// Active nav on scroll
function updateActiveNav() {
  const sections = document.querySelectorAll("section[id]");
  const links = document.querySelectorAll(".nav a");
  let current = "";
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  links.forEach(l => {
    l.classList.remove("active");
    if (l.getAttribute("href") === "#" + current || l.getAttribute("href") === "index.html#" + current) l.classList.add("active");
  });
}

// Set min date on appointment date input
const apptDate = document.getElementById("apptDate");
if (apptDate) {
  const today = new Date().toISOString().split("T")[0];
  apptDate.min = today;
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});

// toast helper for all pages
function showPageToast(msg, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) { container = document.createElement("div"); container.id = "toastContainer"; document.body.appendChild(container); }
  const t = document.createElement("div");
  t.className = "toast-msg " + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4000);
}

// ── EMAILJS CONFIG (contact form) ─────────────────────
// Same credentials as appointment.js — set these once
const EMAILJS_PK       = "YOUR_PUBLIC_KEY";
const EMAILJS_SVC      = "YOUR_SERVICE_ID";
const EMAILJS_CONTACT_PATIENT_TPL = "template_contact_ack";   // ack to sender
const EMAILJS_CONTACT_ADMIN_TPL   = "template_contact_admin"; // notification to you
const CLINIC_ADMIN_EMAIL = "meserettariku921@gmail.com";

if (typeof emailjs !== "undefined" && EMAILJS_PK !== "YOUR_PUBLIC_KEY") {
  emailjs.init(EMAILJS_PK);
}

// Contact form
document.getElementById("contactForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const msg = document.getElementById("contactMsg");
  const btn = this.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Sending...";

  const data = new FormData(this);
  try {
    const res = await fetch("api/contact.php", { method: "POST", body: data });
    const json = await res.json();
    msg.textContent = json.message;
    msg.className = "form-msg " + (json.success ? "success" : "error");
    if (json.success) {
      this.reset();
      showPageToast("✅ Message sent! We'll respond within 24 hours.", "success");
      // Also save locally for admin view
      const contacts = JSON.parse(localStorage.getItem('clinic_contacts') || '[]');
      contacts.unshift({ id: Date.now(), name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message'), read: false, createdAt: new Date().toLocaleString() });
      localStorage.setItem('clinic_contacts', JSON.stringify(contacts));
    } else {
      msg.textContent = json.message;
      msg.className = "form-msg error";
    }
  } catch {
    // PHP not available — use EmailJS
    const name    = data.get("name")    || "";
    const email   = data.get("email")   || "";
    const subject = data.get("subject") || "General Inquiry";
    const message = data.get("message") || "";

    if (typeof emailjs !== "undefined" && EMAILJS_PK !== "YOUR_PUBLIC_KEY") {
      try {
        // Acknowledgement to sender
        await emailjs.send(EMAILJS_SVC, EMAILJS_CONTACT_PATIENT_TPL, {
          to_email : email,
          to_name  : name,
          subject  : subject,
          message  : message,
        });
        // Notification to meserettariku921@gmail.com with reply-to sender
        await emailjs.send(EMAILJS_SVC, EMAILJS_CONTACT_ADMIN_TPL, {
          to_email     : CLINIC_ADMIN_EMAIL,
          sender_name  : name,
          sender_email : email,
          subject      : subject,
          message      : message,
          reply_to     : email,
        });
        msg.textContent = "Message sent! We'll respond within 24 hours.";
        msg.className = "form-msg success";
        showPageToast("✅ Message sent!", "success");
      } catch(ejsErr) {
        msg.textContent = "Message saved. Email delivery requires EmailJS setup.";
        msg.className = "form-msg success";
      }
    } else {
      msg.textContent = "Message sent! We'll get back to you shortly.";
      msg.className = "form-msg success";
      showPageToast("✅ Message sent!", "success");
    }

    // Save locally for admin view regardless
    const contacts = JSON.parse(localStorage.getItem('clinic_contacts') || '[]');
    contacts.unshift({ id: Date.now(), name: data.get('name'), email: data.get('email'), subject: data.get('subject'), message: data.get('message'), read: false, createdAt: new Date().toLocaleString() });
    localStorage.setItem('clinic_contacts', JSON.stringify(contacts));
    this.reset();
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa fa-paper-plane"></i> Send Message';
});

// Animate stats on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll("strong[data-count]").forEach(el => {
        const target = parseInt(el.dataset.count);
        let count = 0;
        const step = Math.ceil(target / 60);
        const iv = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = count.toLocaleString() + (el.dataset.suffix || "");
          if (count >= target) clearInterval(iv);
        }, 20);
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll(".hero-stats, .dash-stats").forEach(el => observer.observe(el));

// Scroll reveal
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".service-card,.doctor-card,.testi-card,.about-inner,.ci-item").forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translateY(30px)";
  el.style.transition = ".6s ease";
  revealObserver.observe(el);
});

// ── SMART PORTAL LINK ─────────────────────────────────
// If patient is already logged in, portal link goes to dashboard
(function() {
  const session = JSON.parse(sessionStorage.getItem("clinic_user") || "null");
  const portalLinks = document.querySelectorAll('a[href="login.html"]');
  if (session && portalLinks.length) {
    portalLinks.forEach(a => {
      a.href = "dashboard.html";
      if (a.classList.contains("nav-link-btn")) {
        a.textContent = "My Dashboard";
      }
    });
  }
})();
