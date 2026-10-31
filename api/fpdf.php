<?php
/**
 * FPDF loader shim — auto-detects installation method
 *
 * Option 1 (Composer): cd clinic-site && composer require setasign/fpdf
 * Option 2 (Manual):   Download fpdf.php from http://fpdf.org and replace this file
 */

// Composer install path
$composerPath = __DIR__ . '/../vendor/setasign/fpdf/fpdf.php';

if (file_exists($composerPath)) {
    require_once $composerPath;
    return;
}

// Not installed — throw exception so pdf.php can catch it
throw new RuntimeException(
    'FPDF not found. Install via Composer: composer require setasign/fpdf ' .
    'OR download fpdf.php from http://fpdf.org and place it in api/'
);
