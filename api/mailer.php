<?php
/**
 * MedCare Mailer — wraps PHPMailer (if installed) or falls back to mail()
 *
 * Configure SMTP settings in config.php
 */

require_once __DIR__ . '/config.php';

// Try loading PHPMailer via Composer autoload
$phpmailerAvailable = file_exists(__DIR__ . '/../vendor/autoload.php');
if ($phpmailerAvailable) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

/**
 * Send an HTML email.
 *
 * @param string $toEmail    Recipient email
 * @param string $toName     Recipient name
 * @param string $subject    Email subject
 * @param string $htmlBody   HTML content
 * @return bool
 */
function sendEmail(string $toEmail, string $toName, string $subject, string $htmlBody): bool
{
    global $phpmailerAvailable;

    // Strip tags for plain-text fallback
    $plainBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $htmlBody));

    if ($phpmailerAvailable && defined('SMTP_HOST') && SMTP_HOST !== '') {
        return sendViaSMTP($toEmail, $toName, $subject, $htmlBody, $plainBody);
    }

    // Fall back to PHP mail()
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . MAIL_FROM_EMAIL . "\r\n";

    return mail($toEmail, $subject, $htmlBody, $headers);
}

function sendViaSMTP(string $toEmail, string $toName, string $subject, string $html, string $plain): bool
{
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;   // 'tls' or 'ssl'
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
        $mail->addAddress($toEmail, $toName);
        $mail->addReplyTo(MAIL_FROM_EMAIL, MAIL_FROM_NAME);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = $plain;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Mailer Error: " . $e->getMessage());
        return false;
    }
}

// ── EMAIL TEMPLATES ──────────────────────────────────

function emailTemplate(string $title, string $body): string
{
    return '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($title) . '</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a73e8,#0a2463);padding:32px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:white;">
            <span style="color:#7dd3fc;">&#10084;</span> MedCare Clinic
          </div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;color:#1a1a2e;line-height:1.7;">
          ' . $body . '
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:13px;color:#94a3b8;">
            &copy; 2026 MedCare Clinic &nbsp;|&nbsp; 123 Health Avenue, Medical City<br>
            <a href="mailto:info@medcareclinic.com" style="color:#1a73e8;text-decoration:none;">info@medcareclinic.com</a>
            &nbsp;|&nbsp; +1 (800) 123-4567
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>';
}

/**
 * Appointment confirmation email to patient.
 */
function sendAppointmentConfirmation(array $data): bool
{
    $name   = htmlspecialchars($data['first_name'] . ' ' . $data['last_name']);
    $dept   = htmlspecialchars($data['department']);
    $doctor = htmlspecialchars($data['doctor'] ?? 'To be assigned');
    $date   = htmlspecialchars($data['appointment_date']);
    $time   = htmlspecialchars($data['appointment_time']);
    $type   = htmlspecialchars($data['visit_type'] ?? 'In-Person');
    $id     = htmlspecialchars((string)($data['id'] ?? 'N/A'));

    $body = '
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a73e8;">Appointment Confirmed ✅</h2>
      <p>Dear <strong>' . $name . '</strong>,</p>
      <p>Your appointment has been received and is <strong>pending confirmation</strong> from our team. Here are your booking details:</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;width:40%;">Reference #</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $id . '</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;background:white;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Department</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $dept . '</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Doctor</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $doctor . '</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;background:white;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Date</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $date . '</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Time</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $time . '</td>
        </tr>
        <tr style="background:white;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Visit Type</td>
          <td style="padding:12px 16px;color:#1a1a2e;">' . $type . '</td>
        </tr>
      </table>

      <p style="background:#eff6ff;border-left:4px solid #1a73e8;padding:14px 16px;border-radius:6px;font-size:14px;margin:0 0 20px;">
        &#128336; Please arrive <strong>10 minutes early</strong> for in-person visits. Bring a valid ID and any relevant medical records.
      </p>

      <p>To manage your appointment, visit your <a href="' . SITE_URL . '/dashboard.html" style="color:#1a73e8;font-weight:600;">Patient Dashboard</a>.</p>
      <p>If you need to cancel or reschedule, please contact us at <a href="tel:+18001234567" style="color:#1a73e8;">+1 (800) 123-4567</a> at least 24 hours in advance.</p>
      <p style="margin-top:28px;color:#64748b;font-size:14px;">Warm regards,<br><strong>MedCare Clinic Team</strong></p>
    ';

    return sendEmail(
        $data['email'],
        $name,
        'Appointment Confirmed — MedCare Clinic',
        emailTemplate('Appointment Confirmed', $body)
    );
}

/**
 * Status update email to patient (confirmed / cancelled).
 */
function sendStatusUpdate(array $appt, string $status): bool
{
    $name   = htmlspecialchars($appt['first_name'] . ' ' . $appt['last_name']);
    $dept   = htmlspecialchars($appt['department']);
    $date   = htmlspecialchars($appt['appointment_date']);
    $time   = htmlspecialchars($appt['appointment_time']);

    $isConfirmed = $status === 'confirmed';
    $color       = $isConfirmed ? '#16a34a' : '#dc2626';
    $icon        = $isConfirmed ? '✅' : '❌';
    $statusText  = ucfirst($status);

    $body = '
      <h2 style="margin:0 0 8px;font-size:22px;color:' . $color . ';">Appointment ' . $statusText . ' ' . $icon . '</h2>
      <p>Dear <strong>' . $name . '</strong>,</p>
      <p>Your appointment has been <strong style="color:' . $color . ';">' . $statusText . '</strong>.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;width:40%;">Department</td>
          <td style="padding:12px 16px;">' . $dept . '</td>
        </tr>
        <tr style="background:white;border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Date</td>
          <td style="padding:12px 16px;">' . $date . '</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Time</td>
          <td style="padding:12px 16px;">' . $time . '</td>
        </tr>
      </table>

      ' . ($isConfirmed
        ? '<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 16px;border-radius:6px;font-size:14px;">Please arrive 10 minutes early and bring your ID and medical records.</p>'
        : '<p style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 16px;border-radius:6px;font-size:14px;">If you wish to rebook, please visit our <a href="' . SITE_URL . '/appointment.html" style="color:#dc2626;font-weight:600;">booking page</a>.</p>'
      ) . '

      <p style="margin-top:28px;color:#64748b;font-size:14px;">Regards,<br><strong>MedCare Clinic Team</strong></p>
    ';

    return sendEmail(
        $appt['email'],
        $name,
        'Appointment ' . $statusText . ' — MedCare Clinic',
        emailTemplate('Appointment ' . $statusText, $body)
    );
}

/**
 * Contact form acknowledgement to sender + notification to clinic.
 */
function sendContactEmails(array $data): void
{
    $name    = htmlspecialchars($data['name']);
    $email   = $data['email'];
    $subject = htmlspecialchars($data['subject'] ?? 'General Inquiry');
    $message = nl2br(htmlspecialchars($data['message']));

    // 1. Acknowledgement to sender
    $ackBody = '
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a73e8;">Message Received ✉️</h2>
      <p>Dear <strong>' . $name . '</strong>,</p>
      <p>Thank you for contacting MedCare Clinic. We have received your message and will respond within <strong>24 hours</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;width:30%;">Subject</td>
          <td style="padding:12px 16px;">' . $subject . '</td>
        </tr>
        <tr style="background:white;">
          <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;vertical-align:top;">Message</td>
          <td style="padding:12px 16px;">' . $message . '</td>
        </tr>
      </table>
      <p style="background:#eff6ff;border-left:4px solid #1a73e8;padding:14px 16px;border-radius:6px;font-size:14px;">
        For urgent matters call us at <a href="tel:+18001234567" style="color:#1a73e8;font-weight:600;">+1 (800) 123-4567</a>.
      </p>
      <p style="margin-top:28px;color:#64748b;font-size:14px;">Best regards,<br><strong>MedCare Clinic</strong></p>
    ';
    sendEmail($email, $name, 'We received your message — MedCare Clinic', emailTemplate('Message Received', $ackBody));

    // 2. Internal notification to meserettariku921@gmail.com
    //    Reply-To is set to the sender so you can reply directly from Gmail
    $internalBody = '
      <h2 style="margin:0 0 8px;font-size:20px;color:#1a73e8;">📬 New Contact Message</h2>
      <p>A visitor sent a message through the MedCare website contact form.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;width:30%;">From</td>
            <td style="padding:12px 16px;"><strong>' . $name . '</strong><br><a href="mailto:' . htmlspecialchars($email) . '" style="color:#1a73e8;">' . htmlspecialchars($email) . '</a></td></tr>
        <tr style="background:white;">
            <td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;">Subject</td>
            <td style="padding:12px 16px;">' . $subject . '</td></tr>
        <tr><td style="padding:12px 16px;font-weight:700;color:#64748b;font-size:13px;vertical-align:top;">Message</td>
            <td style="padding:12px 16px;">' . $message . '</td></tr>
      </table>
      <p style="background:#eff6ff;border-left:4px solid #1a73e8;padding:14px 16px;border-radius:6px;font-size:14px;">
        💡 <strong>Just hit Reply</strong> to respond directly to ' . $name . ' at <a href="mailto:' . htmlspecialchars($email) . '" style="color:#1a73e8;">' . htmlspecialchars($email) . '</a>
      </p>
    ';

    // Use sendViaSMTP / mail() directly with Reply-To header pointing to sender
    global $phpmailerAvailable;
    if ($phpmailerAvailable && defined('SMTP_HOST') && SMTP_HOST !== '') {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = SMTP_SECURE;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
            $mail->addAddress(ADMIN_EMAIL, 'MedCare Admin');
            $mail->addReplyTo($email, $name);   // ← reply goes to the sender
            $mail->isHTML(true);
            $mail->Subject = 'New Message from ' . $name . ' — ' . $subject;
            $mail->Body    = emailTemplate('New Message', $internalBody);
            $mail->AltBody = strip_tags($internalBody);
            $mail->send();
        } catch (Exception $e) {
            error_log("Admin notification error: " . $e->getMessage());
        }
    } else {
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_EMAIL . ">\r\n";
        $headers .= "Reply-To: $name <$email>\r\n";   // ← reply goes to the sender
        mail(ADMIN_EMAIL, 'New Message from ' . $name . ' — ' . $subject, emailTemplate('New Message', $internalBody), $headers);
    }
}

/**
 * New appointment notification to clinic admin.
 */
function sendAdminAppointmentNotification(array $data): void
{
    $name  = htmlspecialchars($data['first_name'] . ' ' . $data['last_name']);
    $dept  = htmlspecialchars($data['department']);
    $date  = htmlspecialchars($data['appointment_date']);
    $time  = htmlspecialchars($data['appointment_time']);
    $email = htmlspecialchars($data['email']);
    $phone = htmlspecialchars($data['phone'] ?? '');

    $body = '
      <h2 style="margin:0 0 8px;font-size:20px;color:#1a73e8;">New Appointment Booking</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;width:35%;">Patient</td><td style="padding:10px 16px;">' . $name . '</td></tr>
        <tr style="background:white;"><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">Email</td><td style="padding:10px 16px;">' . $email . '</td></tr>
        <tr><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">Phone</td><td style="padding:10px 16px;">' . $phone . '</td></tr>
        <tr style="background:white;"><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">Department</td><td style="padding:10px 16px;">' . $dept . '</td></tr>
        <tr><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">Date & Time</td><td style="padding:10px 16px;">' . $date . ' at ' . $time . '</td></tr>
      </table>
      <p style="background:#eff6ff;border-left:4px solid #1a73e8;padding:14px 16px;border-radius:6px;font-size:14px;">
        💡 <strong>Reply to this email</strong> to contact the patient directly at <a href="mailto:' . $email . '" style="color:#1a73e8;">' . $email . '</a>
      </p>
      <p><a href="' . SITE_URL . '/admin/" style="background:#1a73e8;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Manage in Dashboard</a></p>
    ';

    // Send with Reply-To pointing to the patient
    global $phpmailerAvailable;
    if ($phpmailerAvailable && defined('SMTP_HOST') && SMTP_HOST !== '') {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = SMTP_SECURE;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
            $mail->addAddress(ADMIN_EMAIL, 'MedCare Admin');
            $mail->addReplyTo($data['email'], $data['first_name'] . ' ' . $data['last_name']);
            $mail->isHTML(true);
            $mail->Subject = 'New Appointment: ' . $name . ' — ' . $dept;
            $mail->Body    = emailTemplate('New Appointment', $body);
            $mail->AltBody = strip_tags($body);
            $mail->send();
        } catch (Exception $e) {
            error_log("Admin appt notification error: " . $e->getMessage());
        }
    } else {
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_EMAIL . ">\r\n";
        $headers .= "Reply-To: " . $data['first_name'] . " " . $data['last_name'] . " <" . $data['email'] . ">\r\n";
        mail(ADMIN_EMAIL, 'New Appointment: ' . $name . ' — ' . $dept, emailTemplate('New Appointment', $body), $headers);
    }
}
function sendWelcomeEmail(array $user): bool
{
    $name  = htmlspecialchars($user['first'] . ' ' . $user['last']);
    $email = $user['email'];

    $body = '
      <h2 style="margin:0 0 8px;font-size:22px;color:#1a73e8;">Welcome to MedCare! 🎉</h2>
      <p>Dear <strong>' . $name . '</strong>,</p>
      <p>Your patient portal account has been created successfully. You can now:</p>
      <ul style="padding-left:20px;color:#475569;line-height:2;">
        <li>Book appointments online</li>
        <li>View and manage your bookings</li>
        <li>Access your medical records</li>
        <li>Update your profile</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="' . SITE_URL . '/dashboard.html"
           style="background:#1a73e8;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
          Go to My Dashboard
        </a>
      </p>
      <p style="background:#eff6ff;border-left:4px solid #1a73e8;padding:14px 16px;border-radius:6px;font-size:14px;">
        Need help? Call us at <a href="tel:+18001234567" style="color:#1a73e8;font-weight:600;">+1 (800) 123-4567</a>
        or email <a href="mailto:info@medcareclinic.com" style="color:#1a73e8;">info@medcareclinic.com</a>.
      </p>
      <p style="margin-top:28px;color:#64748b;font-size:14px;">Welcome aboard!<br><strong>MedCare Clinic Team</strong></p>
    ';

    return sendEmail($email, $name, 'Welcome to MedCare Clinic!', emailTemplate('Welcome!', $body));
}
