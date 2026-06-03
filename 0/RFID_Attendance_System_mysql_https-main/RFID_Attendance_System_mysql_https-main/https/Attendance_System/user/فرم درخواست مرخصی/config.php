<?php
// config.php

// نمایش خطاها
ini_set('display_errors', 1);
error_reporting(E_ALL);

// تنظیمات پایگاه داده
$servername = "185.94.98.252";
$username = "ewyjapml";
$password = "aezakmiAEZAKMI790";
$dbname = "ewyjapml_Attendance_System";

// ایجاد اتصال
$conn = new mysqli($servername, $username, $password, $dbname);

// بررسی اتصال
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
