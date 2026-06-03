<?php
include 'config.php';
$action = isset($_POST['action']) ? $_POST['action'] : '';

switch ($action) {
    case 'get_employees':
        $sql = "SELECT * FROM EmployeeAttendanceReports";
        $result = $conn->query($sql);
        $employees = [];
        while ($row = $result->fetch_assoc()) {
            $employees[] = $row;
        }
        echo json_encode($employees);
        break;

    case 'add_employee':
        $fullName = $_POST['fullName'];
        $rfidUid = $_POST['rfidUid'];
        $vacationBalance = $_POST['vacationBalance'];

        $sql = "INSERT INTO EmployeeAttendanceReports (Full_name, rfid_uid, vacation_balance) 
                VALUES ('$fullName', '$rfidUid', '$vacationBalance')";

        if ($conn->query($sql) === TRUE) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false]);
        }
        break;

    case 'delete_employee':
        $reportId = $_POST['reportId'];

        $sql = "DELETE FROM EmployeeAttendanceReports WHERE report_id = $reportId";

        if ($conn->query($sql) === TRUE) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false]);
        }
        break;

    default:
        echo json_encode(['success' => false]);
}

$conn->close();
?>