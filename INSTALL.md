# MedCare Clinic — Installation Guide

## Requirements

- PHP 7.4+ with `mysqli` and `openssl` extensions
- MySQL 5.7+ / MariaDB 10.3+
- Apache/Nginx with `mod_rewrite`
- Composer (for PHPMailer)
- A Gmail / SendGrid / Mailgun account for email

---

## Step 1 — Install PHPMailer

```bash
cd clinic-site
composer install
```

This installs PHPMailer into `vendor/`. If Composer is not installed:
```bash
curl -sS https://getcomposer.org/installer | php
php composer.phar install
```

---

## Step 2 — Configure Settings

Edit **`api/config.php`**:

```php
// SMTP — Gmail example
define('SMTP_HOST',   'smtp.gmail.com');
define('SMTP_USER',   'your@gmail.com');
define('SMTP_PASS',   'xxxx xxxx xxxx xxxx');  // Gmail App Password
define('SMTP_SECURE', 'tls');
define('SMTP_PORT',   587);

// From address shown in emails
define('MAIL_FROM_EMAIL', 'noreply@yoursite.com');
define('MAIL_FROM_NAME',  'MedCare Clinic');

// Where admin notifications are sent
define('ADMIN_EMAIL', 'admin@yoursite.com');

// Your live site URL (no trailing slash)
define('SITE_URL', 'https://yoursite.com');
```

Edit **`api/db.php`**:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('DB_NAME', 'medcare_clinic');
```

### Gmail Setup (App Password)
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Go to **App passwords** → create one for "Mail"
4. Paste the 16-character code as `SMTP_PASS`

---

## Step 3 — Database Setup

Visit once in your browser:
```
https://yoursite.com/clinic-site/api/setup.php
```
This creates all tables and the default admin account.

**Delete `api/setup.php` immediately after!**

---

## Step 4 — Test Email

```
https://yoursite.com/clinic-site/api/test-email.php?to=you@example.com
```
**Delete `api/test-email.php` after testing!**

---

## Step 5 — Go Live

1. Upload all files to your server
2. Ensure `vendor/` is uploaded (or run `composer install` on server)
3. Verify `api/.htaccess` is working (config.php should not be accessible directly)
4. Test the full flow: book appointment → check email

---

## Email Events

| Trigger | Recipient | Email |
|---------|-----------|-------|
| Patient registers | Patient | Welcome email |
| Appointment booked | Patient | Booking confirmation + details |
| Appointment booked | Admin | New booking notification |
| Admin confirms appointment | Patient | Confirmation email |
| Admin cancels appointment | Patient | Cancellation email |
| Contact form submitted | Sender | Message acknowledgement |
| Contact form submitted | Admin | New message notification |

---

## Without PHP (Localhost / Static)

Everything works without a server using `localStorage`. No emails are sent in this mode — all data stays in the browser.

---

## File Permissions

```
chmod 644 api/config.php
chmod 755 api/
chmod -R 755 vendor/
```

---

## Default Admin Access

URL: `/clinic-site/admin/`
Username: `admin`
Password: `admin123`

**Change the admin password in `api/admin-api.php` before going live.**


---

## EmailJS Setup (for browser-only / no PHP)

EmailJS lets you send emails directly from the browser — no server needed. Free plan allows 200 emails/month.

### Step 1 — Create EmailJS account
Go to https://www.emailjs.com/ and sign up free.

### Step 2 — Add Email Service
- Dashboard → Email Services → Add New Service
- Choose **Gmail** → connect `meserettariku921@gmail.com`
- Note your **Service ID**

### Step 3 — Create Two Templates

**Template 1: Patient Confirmation** (ID: `template_patient_appt`)
```
Subject: Appointment Confirmed — MedCare Clinic ({{reference}})

Hi {{to_name}},

Your appointment has been booked!

Department : {{department}}
Doctor     : {{doctor}}
Date       : {{appt_date}}
Time       : {{appt_time}}
Type       : {{visit_type}}
Reference  : {{reference}}

Visit your dashboard: {{site_url}}/dashboard.html

MedCare Clinic Team
```

**Template 2: Admin Notification** (ID: `template_admin_appt`)
```
Subject: New Appointment — {{patient_name}} ({{reference}})

New booking received.

Patient  : {{patient_name}}
Email    : {{patient_email}}
Phone    : {{patient_phone}}
Dept     : {{department}}
Doctor   : {{doctor}}
Date     : {{appt_date}} at {{appt_time}}
Type     : {{visit_type}}
Symptoms : {{symptoms}}
Ref      : {{reference}}

Reply to this email to contact the patient directly.
```
Set **To Email** field to `{{to_email}}` in both templates.

### Step 4 — Update appointment.js

Edit `clinic-site/js/appointment.js`:
```js
const EMAILJS_PUBLIC_KEY  = "your_actual_public_key";
const EMAILJS_SERVICE_ID  = "your_service_id";
const EMAILJS_PATIENT_TPL = "template_patient_appt";
const EMAILJS_ADMIN_TPL   = "template_admin_appt";
```

Find your Public Key at: EmailJS Dashboard → Account → API Keys


---

## EmailJS — Contact Form Templates

**Template 3: Contact Acknowledgement** (ID: `template_contact_ack`)
```
Subject: We received your message — MedCare Clinic

Hi {{to_name}},

Thank you for contacting MedCare Clinic. We received your message:

Subject : {{subject}}
Message : {{message}}

We will respond within 24 hours.

MedCare Clinic Team
```
Set **To Email** → `{{to_email}}`

**Template 4: Contact Admin Notification** (ID: `template_contact_admin`)
```
Subject: New Message from {{sender_name}} — {{subject}}

New contact form message:

From    : {{sender_name}} <{{sender_email}}>
Subject : {{subject}}
Message : {{message}}

Reply to this email to respond directly.
```
Set **To Email** → `{{to_email}}`
Set **Reply To** → `{{reply_to}}`

### Update main.js with your keys

Edit `clinic-site/js/main.js`:
```js
const EMAILJS_PK  = "your_actual_public_key";
const EMAILJS_SVC = "your_service_id";
```

> Use the same Public Key and Service ID as in appointment.js — you only need one EmailJS account for all templates.


---

## PHP PDF (FPDF) Setup

The PHP PDF generator uses FPDF. Install it via Composer:

```bash
cd clinic-site
composer require setasign/fpdf
```

Then create `api/fpdf.php` that points to it:

```php
<?php
require_once __DIR__ . '/../vendor/setasign/fpdf/fpdf.php';
```

**OR** download FPDF manually:
1. Go to http://www.fpdf.org/
2. Download `fpdf182.zip`
3. Extract `fpdf.php` into `clinic-site/api/fpdf.php`

### Test PDF generation

```
https://yoursite.com/clinic-site/api/pdf.php?type=record&id=blood_test&email=patient@email.com
```

Should trigger a PDF download. If you see a JSON error about FPDF not installed, check the path above.

### PDF Types

| URL Parameter | Description |
|---|---|
| `type=record&id=blood_test` | Blood Test PDF |
| `type=record&id=ecg` | ECG Report PDF |
| `type=record&id=prescription` | Prescription PDF |
| `type=record&id=xray` | Chest X-Ray PDF |
| `type=all_records` | All records combined |
| `type=appointment&id=123` | Single appointment (DB id) |
| `type=all_appointments` | Full appointment history |

All endpoints also require `&email=patient@email.com`

### Fallback

If FPDF/PHP is not available, the dashboard automatically falls back to **jsPDF** (browser-side PDF generation) — no setup needed.
