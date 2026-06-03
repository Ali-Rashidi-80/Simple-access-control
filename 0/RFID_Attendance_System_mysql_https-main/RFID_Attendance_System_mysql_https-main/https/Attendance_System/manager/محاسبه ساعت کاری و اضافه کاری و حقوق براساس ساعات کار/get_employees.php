<?php
header('Content-Type: application/json');

// اتصال به پایگاه داده
include 'config.php';

// بررسی اتصال
if (!$conn) {
    echo json_encode(['error' => 'اتصال به پایگاه داده ناموفق بود.']);
    exit;
}

// کوئری برای دریافت اسامی کارمندان
$query = "SELECT employee_id, full_name FROM Employees";
$result = $conn->query($query);

$employees = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $employees[] = $row;
    }
    echo json_encode($employees); // داده‌ها به صورت JSON ارسال می‌شود
} else {
    echo json_encode(['error' => 'هیچ کارمندی یافت نشد.']);
}

$conn->close();
?>
