<?php
// Run this once at http://yoursite.com/api/setup.php
$conn = new mysqli('localhost', 'root', '', '');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

$sql = "
CREATE DATABASE IF NOT EXISTS medcare_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medcare_clinic;

CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    dob DATE,
    gender ENUM('male','female','other'),
    blood_type VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    dob DATE,
    gender VARCHAR(10),
    department VARCHAR(100) NOT NULL,
    doctor VARCHAR(100),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    visit_type ENUM('in-person','online') DEFAULT 'in-person',
    symptoms TEXT,
    insurance VARCHAR(150),
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    specialty VARCHAR(100),
    photo VARCHAR(255),
    bio TEXT,
    experience_years INT,
    rating DECIMAL(2,1) DEFAULT 5.0,
    is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO admins (username, email, password_hash)
VALUES ('admin', 'admin@medcare.com', '" . password_hash('admin123', PASSWORD_DEFAULT) . "');
";

// Execute each statement
$statements = array_filter(array_map('trim', explode(';', $sql)));
$errors = [];
foreach ($statements as $stmt) {
    if (!empty($stmt) && !$conn->query($stmt)) {
        $errors[] = $conn->error;
    }
}

$conn->close();

if (empty($errors)) {
    echo '<h2 style="color:green;font-family:sans-serif">✅ Database setup complete!</h2>';
    echo '<p style="font-family:sans-serif">Tables created. Admin: <strong>admin</strong> / <strong>admin123</strong></p>';
    echo '<p style="font-family:sans-serif"><strong>Delete this file after setup!</strong></p>';
} else {
    echo '<h2 style="color:red;font-family:sans-serif">❌ Errors:</h2><pre>';
    print_r($errors);
    echo '</pre>';
}
?>
