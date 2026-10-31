<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'medcare_clinic');

// Load app config if not already loaded
if (!defined('SMTP_HOST')) {
    require_once __DIR__ . '/config.php';
}

function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function jsonResponse($success, $message, $data = []) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

function sanitize($conn, $val) {
    return $conn->real_escape_string(trim(strip_tags($val)));
}
?>
