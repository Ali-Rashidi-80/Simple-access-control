<?php
include 'config.php';

$sql = "SELECT employee_id, Full_name, rfid_uid, vacation_balance FROM EmployeeAttendanceReports";
$result = $conn->query($sql);

$employees = [];
while ($row = $result->fetch_assoc()) {
    $employees[] = $row;
}

echo json_encode($employees);
?>
