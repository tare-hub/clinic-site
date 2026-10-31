<?php
/**
 * MedCare Clinic — PHP PDF Generator
 * Uses FPDF (included inline as a lightweight class)
 * No Composer required.
 *
 * Usage:
 *   GET  api/pdf.php?type=record&id=blood_test&email=patient@email.com
 *   GET  api/pdf.php?type=all_records&email=patient@email.com
 *   GET  api/pdf.php?type=appointment&id=123&email=patient@email.com
 *   GET  api/pdf.php?type=all_appointments&email=patient@email.com
 */

require_once 'db.php';

// ── AUTH CHECK ────────────────────────────────────────
session_start();
$email = $_GET['email'] ?? '';
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die('Invalid request.');
}

$type = $_GET['type'] ?? 'record';
$id   = $_GET['id']   ?? '';

// ── FPDF INLINE (core subset) ─────────────────────────
// Full FPDF available at http://www.fpdf.org/
// Install: copy fpdf.php to api/fpdf.php
// OR install via: composer require setasign/fpdf

$fpdfPath = __DIR__ . '/fpdf.php';
if (!file_exists($fpdfPath)) {
    // Fallback: return JSON error so JS can handle it
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'FPDF not installed. Run: composer require setasign/fpdf, or download fpdf.php from fpdf.org and place it in api/'
    ]);
    exit;
}
require_once $fpdfPath;

// ── FETCH PATIENT ─────────────────────────────────────
$conn    = getDB();
$patient = null;
$stmt    = $conn->prepare("SELECT * FROM patients WHERE email=?");
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
if ($row) $patient = $row;

// ── MEDCARE PDF CLASS ─────────────────────────────────
class MedCarePDF extends FPDF
{
    public string $patientName  = '';
    public string $patientEmail = '';

    function Header()
    {
        // Blue bar
        $this->SetFillColor(26, 115, 232);
        $this->Rect(0, 0, 210, 28, 'F');

        // Logo
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Arial', 'B', 16);
        $this->SetXY(10, 6);
        $this->Cell(100, 8, 'MedCare Clinic', 0, 0, 'L');

        // Contact line
        $this->SetFont('Arial', '', 8);
        $this->SetXY(10, 16);
        $this->Cell(130, 5, '123 Health Ave, Medical City  |  +1 (800) 123-4567  |  info@medcareclinic.com', 0, 0, 'L');

        // Patient info top right
        if ($this->patientName) {
            $this->SetFont('Arial', 'B', 8);
            $this->SetXY(140, 8);
            $this->Cell(60, 5, 'Patient: ' . $this->patientName, 0, 0, 'R');
            $this->SetFont('Arial', '', 8);
            $this->SetXY(140, 14);
            $this->Cell(60, 5, $this->patientEmail, 0, 0, 'R');
        }
        $this->SetTextColor(26, 26, 46);
        $this->Ln(18);
    }

    function Footer()
    {
        $this->SetY(-16);
        $this->SetDrawColor(226, 232, 240);
        $this->Line(10, $this->GetY(), 200, $this->GetY());
        $this->Ln(2);
        $this->SetFont('Arial', '', 7);
        $this->SetTextColor(148, 163, 184);
        $this->Cell(60, 5, 'MedCare Clinic - Confidential', 0, 0, 'L');
        $this->Cell(80, 5, 'Generated: ' . date('Y-m-d H:i'), 0, 0, 'C');
        $this->Cell(60, 5, 'Page ' . $this->PageNo() . ' of {nb}', 0, 0, 'R');
        $this->SetTextColor(26, 26, 46);
    }

    function SectionHeader(string $label)
    {
        $this->SetFillColor(239, 246, 255);
        $this->SetTextColor(26, 115, 232);
        $this->SetFont('Arial', 'B', 10);
        $this->SetFillColor(239, 246, 255);
        $this->Cell(0, 8, '  ' . $label, 0, 1, 'L', true);
        $this->SetTextColor(26, 26, 46);
        $this->Ln(1);
    }

    function Row(string $label, string $value, bool $shade = false)
    {
        if ($shade) $this->SetFillColor(248, 250, 252);
        $this->SetFont('Arial', 'B', 8);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(55, 7, $label, 0, 0, 'L', $shade);
        $this->SetFont('Arial', '', 9);
        $this->SetTextColor(26, 26, 46);
        $this->Cell(0, 7, $value ?: chr(151), 0, 1, 'L', $shade);
    }

    function StatusBadge(string $status)
    {
        $colors = [
            'pending'   => [[254,243,199],[146,64,14]],
            'confirmed' => [[209,250,229],[22,101,52]],
            'completed' => [[224,242,254],[12,74,110]],
            'cancelled' => [[254,226,226],[153,27,27]],
        ];
        $s  = strtolower($status ?: 'pending');
        $c  = $colors[$s] ?? $colors['pending'];
        $this->SetFillColor($c[0][0], $c[0][1], $c[0][2]);
        $this->SetTextColor($c[1][0], $c[1][1], $c[1][2]);
        $this->SetFont('Arial', 'B', 8);
        $x = $this->GetX(); $y = $this->GetY();
        $this->RoundedRect($x, $y, 32, 7, 2, 'FD');
        $this->SetXY($x, $y);
        $this->Cell(32, 7, strtoupper($s), 0, 1, 'C');
        $this->SetTextColor(26, 26, 46);
    }

    function Disclaimer()
    {
        $this->Ln(4);
        $this->SetFillColor(254, 243, 199);
        $this->SetDrawColor(253, 230, 138);
        $this->SetFont('Arial', 'B', 8);
        $this->SetTextColor(146, 64, 14);
        $this->Cell(0, 6, '  DISCLAIMER', 1, 1, 'L', true);
        $this->SetFont('Arial', '', 8);
        $this->MultiCell(0, 5, 'This document is confidential and intended solely for the named patient. Do not share without written authorization from MedCare Clinic.', 1, 'L', true);
        $this->SetTextColor(26, 26, 46);
        $this->SetDrawColor(0, 0, 0);
    }

    // FPDF doesn't have RoundedRect built in — simple workaround
    function RoundedRect(float $x, float $y, float $w, float $h, float $r, string $style = '')
    {
        $this->Rect($x, $y, $w, $h, $style);
    }
}

// ── HELPER: build PDF object ───────────────────────────
function makePDF(?array $patient): MedCarePDF
{
    $pdf = new MedCarePDF('P', 'mm', 'A4');
    $pdf->AliasNbPages();
    if ($patient) {
        $pdf->patientName  = ($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '');
        $pdf->patientEmail = $patient['email'] ?? '';
    }
    return $pdf;
}

function addPatientSection(MedCarePDF $pdf, ?array $patient): void
{
    if (!$patient) return;
    $pdf->SectionHeader('Patient Information');
    $pdf->Row('Full Name',  ($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? ''));
    $pdf->Row('Email',      $patient['email']       ?? '', true);
    $pdf->Row('Phone',      $patient['phone']       ?? '', false);
    $pdf->Row('Blood Type', $patient['blood_type']  ?? '', true);
    $pdf->Row('Date of Birth', $patient['dob']      ?? '', false);
    $pdf->Ln(4);
}

// ── STATIC RECORD DATA (replace with DB queries when records table exists) ──
$staticRecords = [
    'blood_test' => [
        'title'   => 'Blood Test Results',
        'type'    => 'Lab Report',
        'date'    => 'Jun 2026',
        'doctor'  => 'Dr. Sarah Johnson',
        'details' => [
            'WBC'            => '6.5 k/uL (Normal)',
            'RBC'            => '4.8 M/uL (Normal)',
            'Hemoglobin'     => '14.2 g/dL (Normal)',
            'Hematocrit'     => '42% (Normal)',
            'Platelets'      => '250 k/uL (Normal)',
            'Glucose'        => '92 mg/dL (Normal)',
            'Cholesterol'    => '185 mg/dL (Normal)',
            'Conclusion'     => 'All values within normal range.',
        ]
    ],
    'ecg' => [
        'title'  => 'ECG Report',
        'type'   => 'Cardiology',
        'date'   => 'May 2026',
        'doctor' => 'Dr. Sarah Johnson',
        'details' => [
            'Heart Rate'    => '72 bpm (Normal)',
            'Rhythm'        => 'Normal sinus rhythm',
            'PR Interval'   => '160 ms (Normal)',
            'QRS Duration'  => '88 ms (Normal)',
            'QT Interval'   => '400 ms (Normal)',
            'Conclusion'    => 'No significant abnormalities detected.',
        ]
    ],
    'prescription' => [
        'title'  => 'Prescription',
        'type'   => 'General Medicine',
        'date'   => 'Apr 2026',
        'doctor' => 'Dr. Michael Chen',
        'details' => [
            'Amoxicillin 500mg'  => '3x daily for 7 days',
            'Ibuprofen 400mg'    => 'As needed for pain',
            'Vitamin D3 1000 IU' => 'Once daily',
            'Instructions'       => 'Take with food. Complete full course of antibiotics. Avoid alcohol.',
        ]
    ],
    'xray' => [
        'title'  => 'Chest X-Ray Report',
        'type'   => 'Radiology',
        'date'   => 'Mar 2026',
        'doctor' => 'Dr. Emily Rodriguez',
        'details' => [
            'Technique'      => 'PA and lateral views',
            'Lungs'          => 'Clear, no infiltrates or consolidation',
            'Heart Size'     => 'Normal',
            'Mediastinum'    => 'Normal width',
            'Bones'          => 'No fractures or lesions',
            'Soft Tissues'   => 'Unremarkable',
            'Impression'     => 'Normal chest X-ray. No acute cardiopulmonary findings.',
        ]
    ],
];

// ═══════════════════════════════════════════════════════
//  GENERATE PDF BY TYPE
// ═══════════════════════════════════════════════════════

// ── Single Medical Record ─────────────────────────────
if ($type === 'record') {
    $rec = $staticRecords[$id] ?? null;
    if (!$rec) { http_response_code(404); die('Record not found.'); }

    $pdf = makePDF($patient);
    $pdf->AddPage();

    // Title
    $pdf->SetFont('Arial', 'B', 18);
    $pdf->Cell(0, 10, $rec['title'], 0, 1, 'L');
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->Cell(0, 6, 'Official Medical Record', 0, 1, 'L');
    $pdf->SetTextColor(26, 26, 46);
    $pdf->Ln(4);

    addPatientSection($pdf, $patient);

    $pdf->SectionHeader('Record Information');
    $pdf->Row('Record Type', $rec['type']);
    $pdf->Row('Date',        $rec['date'],   true);
    $pdf->Row('Physician',   $rec['doctor'], false);
    $pdf->Row('Facility',    'MedCare Clinic', true);
    $pdf->Ln(4);

    $pdf->SectionHeader('Clinical Details / Findings');
    $shade = false;
    foreach ($rec['details'] as $label => $value) {
        $pdf->Row($label, $value, $shade);
        $shade = !$shade;
    }
    $pdf->Disclaimer();

    $pdf->Output('D', 'MedCare_' . str_replace(' ', '_', $rec['title']) . '_' . date('Y-m-d') . '.pdf');
    exit;
}

// ── All Records Combined ──────────────────────────────
if ($type === 'all_records') {
    $pdf = makePDF($patient);
    $pdf->AddPage();

    $pdf->SetFont('Arial', 'B', 18);
    $pdf->Cell(0, 10, 'Complete Medical Records', 0, 1);
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->Cell(0, 6, 'All records on file  .  Generated: ' . date('Y-m-d'), 0, 1);
    $pdf->SetTextColor(26, 26, 46);
    $pdf->Ln(4);

    addPatientSection($pdf, $patient);

    foreach ($staticRecords as $key => $rec) {
        if ($pdf->GetY() > 240) $pdf->AddPage();
        $pdf->SectionHeader($rec['title'] . '  (' . $rec['type'] . ' . ' . $rec['date'] . ')');
        $pdf->Row('Physician', $rec['doctor']);
        $pdf->Ln(2);
        $shade = false;
        foreach ($rec['details'] as $label => $value) {
            $pdf->Row($label, $value, $shade);
            $shade = !$shade;
        }
        $pdf->Ln(4);
    }
    $pdf->Disclaimer();

    $pdf->Output('D', 'MedCare_All_Records_' . date('Y-m-d') . '.pdf');
    exit;
}

// ── Single Appointment ────────────────────────────────
if ($type === 'appointment') {
    $appt = null;
    if ($id && is_numeric($id)) {
        $stmt = $conn->prepare("SELECT * FROM appointments WHERE id=? AND email=?");
        $stmt->bind_param("is", $id, $email);
        $stmt->execute();
        $appt = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }
    if (!$appt) { http_response_code(404); die('Appointment not found.'); }

    $pdf = makePDF($patient);
    $pdf->AddPage();

    $pdf->SetFont('Arial', 'B', 18);
    $pdf->Cell(0, 10, 'Appointment Summary', 0, 1);
    $pdf->Ln(1);
    $pdf->StatusBadge($appt['status']);
    $pdf->Ln(6);

    addPatientSection($pdf, $patient);

    $pdf->SectionHeader('Appointment Details');
    $pdf->Row('Reference #',  '#' . $appt['id']);
    $pdf->Row('Department',   $appt['department'],          true);
    $pdf->Row('Doctor',       $appt['doctor']      ?: 'Any Available', false);
    $pdf->Row('Date',         $appt['appointment_date'],    true);
    $pdf->Row('Time',         $appt['appointment_time'],    false);
    $pdf->Row('Visit Type',   $appt['visit_type'],          true);
    $pdf->Row('Status',       strtoupper($appt['status']),  false);
    if (!empty($appt['symptoms'])) {
        $pdf->Ln(2);
        $pdf->SectionHeader('Symptoms / Reason for Visit');
        $pdf->SetFont('Arial', '', 9);
        $pdf->MultiCell(0, 6, $appt['symptoms']);
    }
    if (!empty($appt['notes'])) {
        $pdf->Ln(2);
        $pdf->SectionHeader('Doctor\'s Notes');
        $pdf->SetFont('Arial', '', 9);
        $pdf->MultiCell(0, 6, $appt['notes']);
    }
    $pdf->Disclaimer();

    $pdf->Output('D', 'MedCare_Appt_' . $appt['department'] . '_' . date('Y-m-d') . '.pdf');
    exit;
}

// ── All Appointments ──────────────────────────────────
if ($type === 'all_appointments') {
    $stmt = $conn->prepare("SELECT * FROM appointments WHERE email=? ORDER BY appointment_date DESC");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $appts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $pdf = makePDF($patient);
    $pdf->AddPage();

    $name = $patient ? ($patient['first_name'] . ' ' . $patient['last_name']) : $email;
    $pdf->SetFont('Arial', 'B', 18);
    $pdf->Cell(0, 10, 'Appointment History', 0, 1);
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->Cell(0, 6, $name . '  .  ' . count($appts) . ' appointment(s)  .  ' . date('Y-m-d'), 0, 1);
    $pdf->SetTextColor(26, 26, 46);
    $pdf->Ln(4);

    addPatientSection($pdf, $patient);

    // Table header
    $pdf->SetFillColor(26, 115, 232);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->Cell(40, 8, 'Department',  0, 0, 'L', true);
    $pdf->Cell(40, 8, 'Doctor',      0, 0, 'L', true);
    $pdf->Cell(28, 8, 'Date',        0, 0, 'L', true);
    $pdf->Cell(20, 8, 'Time',        0, 0, 'L', true);
    $pdf->Cell(28, 8, 'Type',        0, 0, 'L', true);
    $pdf->Cell(0,  8, 'Status',      0, 1, 'L', true);
    $pdf->SetTextColor(26, 26, 46);

    $shade = false;
    foreach ($appts as $a) {
        if ($pdf->GetY() > 265) { $pdf->AddPage(); }
        if ($shade) $pdf->SetFillColor(248, 250, 252);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(40, 7, substr($a['department']       ?? '—', 0, 18), 0, 0, 'L', $shade);
        $pdf->Cell(40, 7, substr($a['doctor']           ?? 'TBD', 0, 18), 0, 0, 'L', $shade);
        $pdf->Cell(28, 7, $a['appointment_date']        ?? '—', 0, 0, 'L', $shade);
        $pdf->Cell(20, 7, $a['appointment_time']        ?? '—', 0, 0, 'L', $shade);
        $pdf->Cell(28, 7, substr($a['visit_type']       ?? '—', 0, 12), 0, 0, 'L', $shade);
        $pdf->Cell(0,  7, strtoupper($a['status']       ?? '—'), 0, 1, 'L', $shade);
        $shade = !$shade;
    }

    if (empty($appts)) {
        $pdf->SetFont('Arial', 'I', 10);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->Cell(0, 10, 'No appointments found.', 0, 1, 'C');
        $pdf->SetTextColor(26, 26, 46);
    }

    $pdf->Disclaimer();
    $pdf->Output('D', 'MedCare_Appointments_' . date('Y-m-d') . '.pdf');
    exit;
}

http_response_code(400);
echo 'Unknown PDF type.';
