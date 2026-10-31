# MedCare Clinic Website

A full-stack clinic website — HTML/CSS/JS frontend + PHP/MySQL backend.

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Homepage | `index.html` | Hero, services, doctors, about, testimonials, contact |
| Book Appointment | `appointment.html` | Full booking form |
| Login | `login.html` | Patient sign in, register, forgot password |
| Dashboard | `dashboard.html` | Patient dashboard (protected — redirects to login if not authenticated) |
| Admin | `admin/` | Clinic admin panel |

## File Structure

```
clinic-site/
├── index.html
├── appointment.html
├── login.html              ← Patient auth (sign in / register / forgot password)
├── dashboard.html          ← Patient dashboard (protected)
├── patient-portal.html     ← Legacy (redirects handled, keep for compatibility)
├── css/
│   ├── style.css           ← Global styles
│   ├── auth.css            ← Login page styles
│   └── dashboard.css       ← Dashboard styles
├── js/
│   ├── main.js             ← Shared (nav, animations, contact form, smart portal link)
│   ├── appointment.js      ← Appointment booking form
│   ├── auth.js             ← Login / register / forgot password logic
│   └── dashboard.js        ← Patient dashboard logic
├── api/
│   ├── db.php              ← DB connection helper
│   ├── setup.php           ← ONE-TIME database setup — DELETE AFTER USE
│   ├── appointment.php     ← POST: book appointment
│   ├── auth.php            ← POST/GET: register, login, profile, appointments
│   ├── contact.php         ← POST: contact messages
│   └── admin-api.php       ← Admin CRUD API (session-protected)
└── admin/
    ├── index.html          ← Admin dashboard
    ├── admin.css
    └── admin.js
```

## Authentication Flow

```
Homepage → "Patient Portal" button
  ├── Not logged in  →  login.html  →  dashboard.html
  └── Logged in      →  dashboard.html  (smart redirect)

login.html tabs:
  ├── Sign In       → validates → sets sessionStorage → redirect to dashboard.html
  ├── Register      → validates → saves to localStorage/DB → redirect to dashboard.html
  └── Forgot Pw     → resets password in localStorage/DB

dashboard.html:
  └── guard: if no session → redirect to login.html
```

## Setup with PHP + MySQL

See **[INSTALL.md](INSTALL.md)** for the full setup guide including:
- PHPMailer installation via Composer
- SMTP / Gmail configuration
- Database setup
- Email testing

## Quick Setup (TL;DR)

```bash
cd clinic-site
composer install              # installs PHPMailer
# edit api/config.php         # set SMTP + DB credentials
# visit /api/setup.php once   # creates DB tables
# delete /api/setup.php       # security!
```

## Without PHP (Static / Localhost)

Works fully with just a browser. All data stored in `localStorage` / `sessionStorage`:
- Register creates a local account
- Login checks local storage
- Appointments saved locally and visible in dashboard
- Contact messages saved locally and visible in admin
- All validation and auth logic runs client-side

## Default Credentials

| Role    | Access | Default |
|---------|--------|---------|
| Patient | Register at `login.html` | — |
| Admin   | `admin/` | **admin** / **admin123** |

## Features Summary

- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Patient register / login / forgot password
- ✅ Book appointments with slot validation
- ✅ Patient dashboard — view, filter, cancel appointments
- ✅ Profile editing + password change
- ✅ Admin dashboard — appointments, patients, messages
- ✅ Work without PHP (localStorage fallback)
- ✅ PHP + MySQL backend ready
- ✅ Email notifications (PHPMailer + SMTP)
  - Welcome email on registration
  - Appointment confirmation to patient
  - New booking notification to admin
  - Status update (confirmed / cancelled) to patient
  - Contact form acknowledgement + admin notification
