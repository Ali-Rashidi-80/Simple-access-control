<?php
include 'config.php';

$employee_id = $_GET['id'];

$sql = "SELECT * FROM EmployeeAttendanceReports WHERE employee_id = '$employee_id'";
$result = $conn->query($sql);
$row = $result->fetch_assoc();

echo json_encode($row);
?>
