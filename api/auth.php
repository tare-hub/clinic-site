<?php
require_once 'db.php';
require_once 'mailer.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_GET['action'] ?? '';

// ── REGISTER ──────────────────────────────────────────
if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn = getDB();
    $first = sanitize($conn, $_POST['first'] ?? '');
    $last  = sanitize($conn, $_POST['last']  ?? '');
    $email = sanitize($conn, $_POST['email'] ?? '');
    $phone = sanitize($conn, $_POST['phone'] ?? '');
    $pass  = $_POST['password'] ?? '';

    if (!$first || !$last || !$email || !$pass) jsonResponse(false, 'All fields are required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(false, 'Invalid email address.');
    if (strlen($pass) < 6) jsonResponse(false, 'Password must be at least 6 characters.');

    $check = $conn->prepare("SELECT id FROM patients WHERE email=?");
    $check->bind_param("s", $email);
    $check->execute();
    if ($check->get_result()->num_rows > 0) jsonResponse(false, 'An account with this email already exists.');
    $check->close();

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO patients (first_name,last_name,email,phone,password_hash) VALUES (?,?,?,?,?)");
    $stmt->bind_param("sssss", $first, $last, $email, $phone, $hash);

    if ($stmt->execute()) {
        $user = ['id'=>$conn->insert_id,'first'=>$first,'last'=>$last,'email'=>$email,'phone'=>$phone];
        // Send welcome email
        sendWelcomeEmail($user);
        jsonResponse(true, 'Account created successfully!', ['user'=>$user]);
    } else {
        jsonResponse(false, 'Registration failed. Please try again.');
    }
}

// ── LOGIN ─────────────────────────────────────────────
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn  = getDB();
    $email = sanitize($conn, $_POST['email'] ?? '');
    $pass  = $_POST['password'] ?? '';

    if (!$email || !$pass) jsonResponse(false, 'Email and password are required.');

    $stmt = $conn->prepare("SELECT id,first_name,last_name,email,phone,password_hash FROM patients WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($pass, $row['password_hash'])) {
        jsonResponse(false, 'Incorrect email or password.');
    }

    $user = [
        'id'    => $row['id'],
        'first' => $row['first_name'],
        'last'  => $row['last_name'],
        'email' => $row['email'],
        'phone' => $row['phone']
    ];
    jsonResponse(true, 'Login successful.', ['user' => $user]);
}

// ── GET APPOINTMENTS ───────────────────────────────────
if ($action === 'appointments' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $conn  = getDB();
    $email = sanitize($conn, $_GET['email'] ?? '');
    if (!$email) jsonResponse(false, 'Email required.');

    $stmt = $conn->prepare("SELECT * FROM appointments WHERE email=? ORDER BY appointment_date DESC");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jsonResponse(true, 'OK', ['appointments' => $rows]);
}

// ── UPDATE PROFILE ─────────────────────────────────────
if ($action === 'update_profile' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $conn  = getDB();
    $email = sanitize($conn, $_POST['email'] ?? '');
    $first = sanitize($conn, $_POST['first'] ?? '');
    $last  = sanitize($conn, $_POST['last']  ?? '');
    $phone = sanitize($conn, $_POST['phone'] ?? '');
    $dob   = sanitize($conn, $_POST['dob']   ?? '');
    $blood = sanitize($conn, $_POST['blood'] ?? '');

    $stmt = $conn->prepare("UPDATE patients SET first_name=?,last_name=?,phone=?,dob=?,blood_type=? WHERE email=?");
    $dobVal = !empty($dob) ? $dob : null;
    $stmt->bind_param("ssssss", $first, $last, $phone, $dobVal, $blood, $email);
    if ($stmt->execute()) {
        jsonResponse(true, 'Profile updated successfully.');
    } else {
        jsonResponse(false, 'Update failed.');
    }
}

jsonResponse(false, 'Invalid action.');
?>
