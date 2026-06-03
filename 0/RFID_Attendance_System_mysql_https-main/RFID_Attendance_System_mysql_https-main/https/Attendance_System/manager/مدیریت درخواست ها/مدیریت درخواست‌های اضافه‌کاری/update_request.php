<?php
include 'config.php';

// دریافت داده‌ها از درخواست AJAX
$requestId = $_POST['id'];
$status = $_POST['status'];

// بروزرسانی وضعیت درخواست در دیتابیس
$sql = "UPDATE OvertimeRequests SET approval_status = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $status, $requestId);

if ($stmt->execute()) {
    echo 'success';
} else {
    echo 'error';
}

$stmt->close();
$conn->close();
?>
