<?php
require_once 'db.php';
require_once 'mailer.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed.');
}

$conn    = getDB();
$name    = sanitize($conn, $_POST['name']    ?? '');
$email   = sanitize($conn, $_POST['email']   ?? '');
$subject = sanitize($conn, $_POST['subject'] ?? '');
$message = sanitize($conn, $_POST['message'] ?? '');

if (!$name || !$email || !$message) jsonResponse(false, 'Name, email and message are required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(false, 'Invalid email address.');

$stmt = $conn->prepare("INSERT INTO contacts (name,email,subject,message) VALUES (?,?,?,?)");
$stmt->bind_param("ssss", $name, $email, $subject, $message);

if ($stmt->execute()) {
    // Send acknowledgement to sender + notification to admin
    sendContactEmails([
        'name'    => $name,
        'email'   => $email,
        'subject' => $subject,
        'message' => $message,
    ]);
    jsonResponse(true, 'Thank you! Your message has been received. We\'ll respond within 24 hours.');
} else {
    jsonResponse(false, 'Failed to send message. Please try again.');
}
?>
