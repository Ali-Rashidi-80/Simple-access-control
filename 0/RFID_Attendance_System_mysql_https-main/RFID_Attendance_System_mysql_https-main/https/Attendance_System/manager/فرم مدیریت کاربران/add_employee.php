<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $full_name = $_POST['Full_name'];
    $rfid_uid = $_POST['rfid_uid'];
    $vacation_balance = $_POST['vacation_balance'];

    $sql = "INSERT INTO EmployeeAttendanceReports (Full_name, rfid_uid, vacation_balance) 
            VALUES ('$full_name', '$rfid_uid', '$vacation_balance')";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(['message' => 'کارمند با موفقیت اضافه شد']);
    } else {
        echo json_encode(['message' => 'خطا در افزودن کارمند']);
    }
}
?>
