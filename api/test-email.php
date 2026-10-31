<?php
/**
 * Email test endpoint — DELETE THIS FILE IN PRODUCTION
 * Visit: http://yoursite.com/clinic-site/api/test-email.php?to=you@example.com
 */
require_once 'mailer.php';

$to = $_GET['to'] ?? ADMIN_EMAIL;

if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    die('<p style="color:red;font-family:sans-serif">Invalid email address.</p>');
}

$sent = sendEmail(
    $to,
    'Test Recipient',
    'MedCare Email Test — ' . date('Y-m-d H:i:s'),
    emailTemplate('Email Test', '
        <h2 style="color:#1a73e8;">Email is working! ✅</h2>
        <p>This is a test email from your MedCare Clinic installation.</p>
        <p>If you can read this, your email configuration is correct.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:10px;overflow:hidden;">
          <tr><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;width:30%;">SMTP Host</td><td style="padding:10px 16px;">' . SMTP_HOST . '</td></tr>
          <tr style="background:white;"><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">From</td><td style="padding:10px 16px;">' . MAIL_FROM_EMAIL . '</td></tr>
          <tr><td style="padding:10px 16px;font-weight:700;color:#64748b;font-size:13px;">Time</td><td style="padding:10px 16px;">' . date('Y-m-d H:i:s') . '</td></tr>
        </table>
        <p style="color:#64748b;font-size:14px;">MedCare Clinic</p>
    ')
);

header('Content-Type: text/html');
if ($sent) {
    echo '<div style="font-family:sans-serif;max-width:500px;margin:60px auto;background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:28px;">
        <h2 style="color:#16a34a;margin:0 0 12px">✅ Email Sent!</h2>
        <p>A test email was sent to <strong>' . htmlspecialchars($to) . '</strong>.</p>
        <p style="font-size:13px;color:#64748b;">Check your inbox (and spam folder).</p>
        <p style="margin-top:20px;font-size:13px;color:#ef4444;font-weight:600;">Remember to delete this file before going live.</p>
    </div>';
} else {
    echo '<div style="font-family:sans-serif;max-width:500px;margin:60px auto;background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:28px;">
        <h2 style="color:#ef4444;margin:0 0 12px">❌ Email Failed</h2>
        <p>Could not send email. Check your <code>config.php</code> settings:</p>
        <ul style="font-size:14px;color:#64748b;line-height:2;">
            <li>SMTP_HOST, SMTP_USER, SMTP_PASS</li>
            <li>Gmail: enable 2FA and use an App Password</li>
            <li>Check server error logs for details</li>
        </ul>
        <p>Also verify PHPMailer is installed: <code>composer install</code></p>
    </div>';
}
