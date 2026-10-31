<?php
require_once 'db.php';
require_once 'mailer.php';
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── ADMIN LOGIN ────────────────────────────────────────
if ($action === 'login') {
    $conn = getDB();
    $user = sanitize($conn, $_POST['username'] ?? '');
    $pass = $_POST['password'] ?? '';
    $stmt = $conn->prepare("SELECT id,username,password_hash FROM admins WHERE username=?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || !password_verify($pass, $row['password_hash'])) {
        jsonResponse(false, 'Invalid credentials.');
    }
    $_SESSION['admin_id']   = $row['id'];
    $_SESSION['admin_user'] = $row['username'];
    jsonResponse(true, 'Login successful.', ['username' => $row['username']]);
}

// ── AUTH GUARD ─────────────────────────────────────────
if (empty($_SESSION['admin_id'])) {
    jsonResponse(false, 'Unauthorized. Please log in.');
}

// ── LOGOUT ────────────────────────────────────────────
if ($action === 'logout') {
    session_destroy();
    jsonResponse(true, 'Logged out.');
}

// ── STATS ─────────────────────────────────────────────
if ($action === 'stats') {
    $conn = getDB();
    $patients    = $conn->query("SELECT COUNT(*) c FROM patients")->fetch_assoc()['c'];
    $appointments= $conn->query("SELECT COUNT(*) c FROM appointments")->fetch_assoc()['c'];
    $pending     = $conn->query("SELECT COUNT(*) c FROM appointments WHERE status='pending'")->fetch_assoc()['c'];
    $contacts    = $conn->query("SELECT COUNT(*) c FROM contacts WHERE is_read=0")->fetch_assoc()['c'];
    jsonResponse(true, 'OK', compact('patients','appointments','pending','contacts'));
}

// ── GET APPOINTMENTS ───────────────────────────────────
if ($action === 'get_appointments') {
    $conn   = getDB();
    $status = $_GET['status'] ?? '';
    $search = sanitize($conn, $_GET['search'] ?? '');
    $page   = max(1, intval($_GET['page'] ?? 1));
    $limit  = 15;
    $offset = ($page - 1) * $limit;

    $where = "WHERE 1=1";
    if ($status) $where .= " AND status='$status'";
    if ($search) $where .= " AND (first_name LIKE '%$search%' OR last_name LIKE '%$search%' OR email LIKE '%$search%' OR department LIKE '%$search%')";

    $total = $conn->query("SELECT COUNT(*) c FROM appointments $where")->fetch_assoc()['c'];
    $rows  = $conn->query("SELECT * FROM appointments $where ORDER BY created_at DESC LIMIT $limit OFFSET $offset")->fetch_all(MYSQLI_ASSOC);
    jsonResponse(true, 'OK', ['appointments'=>$rows,'total'=>$total,'pages'=>ceil($total/$limit)]);
}

// ── UPDATE APPOINTMENT STATUS ──────────────────────────
if ($action === 'update_appointment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn   = getDB();
    $id     = intval($_POST['id']);
    $status = sanitize($conn, $_POST['status']);
    $notes  = sanitize($conn, $_POST['notes'] ?? '');
    $valid  = ['pending','confirmed','completed','cancelled'];
    if (!in_array($status, $valid)) jsonResponse(false, 'Invalid status.');

    $stmt = $conn->prepare("UPDATE appointments SET status=?, notes=? WHERE id=?");
    $stmt->bind_param("ssi", $status, $notes, $id);
    $stmt->execute();

    // Send email if status changed to confirmed or cancelled
    if (in_array($status, ['confirmed', 'cancelled'])) {
        $row = $conn->query("SELECT * FROM appointments WHERE id=$id")->fetch_assoc();
        if ($row) sendStatusUpdate($row, $status);
    }

    jsonResponse(true, 'Appointment updated.');
}

// ── SEND STATUS EMAIL MANUALLY ────────────────────────
if ($action === 'send_status_email' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn   = getDB();
    $id     = intval($_POST['id']);
    $status = sanitize($conn, $_POST['status']);

    if (!in_array($status, ['confirmed','cancelled'])) {
        jsonResponse(false, 'Only confirmed or cancelled status emails can be sent.');
    }

    $row = null;
    if ($id > 0) {
        $row = $conn->query("SELECT * FROM appointments WHERE id=$id")->fetch_assoc();
    }

    // If not found in DB, use posted data (for localStorage-based admin)
    if (!$row) {
        $row = [
            'first_name'       => sanitize($conn, $_POST['first_name'] ?? ''),
            'last_name'        => sanitize($conn, $_POST['last_name']  ?? ''),
            'email'            => sanitize($conn, $_POST['email']       ?? ''),
            'department'       => sanitize($conn, $_POST['department']  ?? ''),
            'appointment_date' => sanitize($conn, $_POST['appointment_date'] ?? ''),
            'appointment_time' => sanitize($conn, $_POST['appointment_time'] ?? ''),
            'doctor'           => sanitize($conn, $_POST['doctor']      ?? ''),
        ];
    }

    if (empty($row['email'])) jsonResponse(false, 'Patient email not found.');

    $sent = sendStatusUpdate($row, $status);
    jsonResponse($sent, $sent ? 'Email sent to ' . $row['email'] : 'Failed to send email. Check server mail config.');
}

// ── GET PATIENTS ──────────────────────────────────────
if ($action === 'get_patients') {
    $conn   = getDB();
    $search = sanitize($conn, $_GET['search'] ?? '');
    $where  = $search ? "WHERE first_name LIKE '%$search%' OR last_name LIKE '%$search%' OR email LIKE '%$search%'" : "";
    $rows   = $conn->query("SELECT id,first_name,last_name,email,phone,created_at FROM patients $where ORDER BY created_at DESC")->fetch_all(MYSQLI_ASSOC);
    jsonResponse(true, 'OK', ['patients'=>$rows]);
}

// ── DELETE PATIENT ────────────────────────────────────
if ($action === 'delete_patient' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn = getDB();
    $id   = intval($_POST['id']);
    $conn->query("DELETE FROM patients WHERE id=$id");
    jsonResponse(true, 'Patient removed.');
}

// ── GET CONTACTS ──────────────────────────────────────
if ($action === 'get_contacts') {
    $conn = getDB();
    $rows = $conn->query("SELECT * FROM contacts ORDER BY created_at DESC")->fetch_all(MYSQLI_ASSOC);
    $conn->query("UPDATE contacts SET is_read=1");
    jsonResponse(true, 'OK', ['contacts'=>$rows]);
}

// ── DELETE CONTACT ────────────────────────────────────
if ($action === 'delete_contact' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn = getDB();
    $id   = intval($_POST['id']);
    $conn->query("DELETE FROM contacts WHERE id=$id");
    jsonResponse(true, 'Deleted.');
}

jsonResponse(false, 'Unknown action.');
?>
