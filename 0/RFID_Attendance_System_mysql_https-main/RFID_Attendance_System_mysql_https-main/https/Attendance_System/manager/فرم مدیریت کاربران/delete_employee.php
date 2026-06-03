<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"), true);
$employee_id = $data['employee_id'];

$sql = "DELETE FROM EmployeeAttendanceReports WHERE employee_id = '$employee_id'";

if ($conn->query($sql) === TRUE) {
    echo json_encode(['message' => 'کارمند با موفقیت حذف شد']);
} else {
    echo json_encode(['message' => 'خطا در حذف کارمند']);
}
?>
