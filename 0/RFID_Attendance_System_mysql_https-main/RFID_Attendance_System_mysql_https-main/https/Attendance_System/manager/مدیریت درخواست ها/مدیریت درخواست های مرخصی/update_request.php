<?php
// اتصال به پایگاه داده
include 'config.php'; 

// گرفتن داده‌ها از درخواست POST
$id = $_POST['id'];
$action = $_POST['action'];
$manager_name = "مدیر";  // به‌طور ثابت مقداردهی می‌شود (در اینجا "مدیر" به عنوان مثال)

// تبدیل مقادیر action به مقادیر صحیح برای approval_status
if ($action == 'approve') {
    $approval_status = 'تایید شده';
} elseif ($action == 'reject') {
    $approval_status = 'رد شده';
} else {
    echo 'error';
    exit();
}

// استفاده از Prepared Statement برای جلوگیری از مشکلات SQL
$stmt = $conn->prepare("UPDATE vacation_reports SET approval_status = ?, approved_by = ? WHERE vacation_id = ?");
$stmt->bind_param("ssi", $approval_status, $manager_name, $id);

// اجرای کوئری
if ($stmt->execute()) {
    echo 'success';
} else {
    echo 'error';
}

// بستن اتصال
$stmt->close();
$conn->close();
?>
