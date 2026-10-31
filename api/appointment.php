<?php
require_once 'db.php';
require_once 'mailer.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed.');
}

$conn = getDB();

// Required fields
$required = ['first_name','last_name','email','phone','department','appointment_date','appointment_time'];
foreach ($required as $field) {
    if (empty($_POST[$field])) {
        jsonResponse(false, "Field '$field' is required.");
    }
}

$first    = sanitize($conn, $_POST['first_name']);
$last     = sanitize($conn, $_POST['last_name']);
$email    = sanitize($conn, $_POST['email']);
$phone    = sanitize($conn, $_POST['phone']);
$dob      = sanitize($conn, $_POST['dob'] ?? '');
$gender   = sanitize($conn, $_POST['gender'] ?? '');
$dept     = sanitize($conn, $_POST['department']);
$doctor   = sanitize($conn, $_POST['doctor'] ?? 'Any Available');
$date     = sanitize($conn, $_POST['appointment_date']);
$time     = sanitize($conn, $_POST['appointment_time']);
$type     = sanitize($conn, $_POST['visit_type'] ?? 'in-person');
$symptoms = sanitize($conn, $_POST['symptoms'] ?? '');
$insurance= sanitize($conn, $_POST['insurance'] ?? '');

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.');
}

// Validate date is not in the past
if (strtotime($date) < strtotime(date('Y-m-d'))) {
    jsonResponse(false, 'Appointment date cannot be in the past.');
}

// Check if slot already taken
$check = $conn->prepare("SELECT id FROM appointments WHERE appointment_date=? AND appointment_time=? AND doctor=? AND status != 'cancelled'");
$check->bind_param("sss", $date, $time, $doctor);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    jsonResponse(false, 'This time slot is already booked with that doctor. Please choose another time.');
}
$check->close();

// Find patient account if exists
$patient_id = null;
$res = $conn->prepare("SELECT id FROM patients WHERE email=?");
$res->bind_param("s", $email);
$res->execute();
$row = $res->get_result()->fetch_assoc();
if ($row) $patient_id = $row['id'];
$res->close();

// Insert appointment
$stmt = $conn->prepare("
    INSERT INTO appointments
    (patient_id, first_name, last_name, email, phone, dob, gender, department, doctor,
     appointment_date, appointment_time, visit_type, symptoms, insurance)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
");

$dobVal = !empty($dob) ? $dob : null;
$stmt->bind_param("isssssssssssss",
    $patient_id, $first, $last, $email, $phone,
    $dobVal, $gender, $dept, $doctor,
    $date, $time, $type, $symptoms, $insurance
);

if ($stmt->execute()) {
    $appt_id = $conn->insert_id;
    $stmt->close();
    $conn->close();

    // Send confirmation email to patient + admin notification
    $emailData = array_merge($_POST, [
        'id'              => $appt_id,
        'first_name'      => $first,
        'last_name'       => $last,
        'email'           => $email,
        'phone'           => $phone,
        'department'      => $dept,
        'doctor'          => $doctor,
        'appointment_date'=> $date,
        'appointment_time'=> $time,
        'visit_type'      => $type,
    ]);
    sendAppointmentConfirmation($emailData);
    sendAdminAppointmentNotification($emailData);

    jsonResponse(true, "Appointment booked! Reference #$appt_id. A confirmation email has been sent to $email.", ['appointment_id' => $appt_id]);
} else {
    jsonResponse(false, 'Failed to book appointment. Please try again.');
}
?>
