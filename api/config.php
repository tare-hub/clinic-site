<?php
/**
 * MedCare Clinic — Configuration
 * Edit this file with your actual values before going live.
 */

// ── SMTP (e.g. Gmail, SendGrid, Mailgun) ──────────────
// Leave SMTP_HOST empty '' to use PHP mail() instead.
define('SMTP_HOST',   'smtp.gmail.com');   // or smtp.sendgrid.net, etc.
define('SMTP_USER',   'your@gmail.com');   // your SMTP username
define('SMTP_PASS',   'your-app-password');// Gmail: use App Password, not account password
define('SMTP_SECURE', 'tls');              // 'tls' (port 587) or 'ssl' (port 465)
define('SMTP_PORT',   587);

// ── FROM ADDRESS ──────────────────────────────────────
define('MAIL_FROM_EMAIL', 'noreply@medcareclinic.com');
define('MAIL_FROM_NAME',  'MedCare Clinic');

// ── ADMIN NOTIFICATION EMAIL ──────────────────────────
define('ADMIN_EMAIL', 'meserettariku921@gmail.com');

// ── SITE URL (no trailing slash) ──────────────────────
define('SITE_URL', 'https://medcareclinic.com');
