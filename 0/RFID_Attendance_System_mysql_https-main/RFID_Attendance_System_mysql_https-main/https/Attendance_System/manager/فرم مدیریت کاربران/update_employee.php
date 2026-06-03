<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $employee_id = $_POST['employee_id'];
    $full_name = $_POST['Full_name'];
    $rfid_uid = $_POST['rfid_uid'];
    $vacation_balance = $_POST['vacation_balance'];

    $sql = "UPDATE EmployeeAttendanceReports 
            SET Full_name = '$full_name', rfid_uid = '$rfid_uid', vacation_balance = '$vacation_balance'
            WHERE employee_id = '$employee_id'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(['message' => 'اطلاعات کارمند با موفقیت به‌روزرسانی شد']);
    } else {
        echo json_encode(['message' => 'خطا در به‌روزرسانی کارمند']);
    }
}
?>
