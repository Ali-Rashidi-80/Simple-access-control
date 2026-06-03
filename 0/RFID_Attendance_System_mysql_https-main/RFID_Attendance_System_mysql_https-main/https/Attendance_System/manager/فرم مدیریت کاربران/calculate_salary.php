<?php
header('Content-Type: application/json');
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $employee_id = $_POST['employee_id'];
    $start_date = $_POST['start_date'];
    $end_date = $_POST['end_date'];

    $query = "
        SELECT 
            SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time)) AS total_worked_hours,
            IF(SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time)) > 8, 
                (SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time)) - 8) * 1.4, 0) AS overtime_hours,
            (e.hourly_rate * SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time))) + 
            (e.hourly_rate * IF(SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time)) > 8, 
                (SUM(TIMESTAMPDIFF(HOUR, a.check_in_time, a.check_out_time)) - 8) * 1.4, 0)) AS total_salary
        FROM 
            EmployeeAttendanceReports a
        JOIN 
            Employees e ON a.employee_id = e.employee_id
        WHERE 
            a.employee_id = ? AND a.date BETWEEN ? AND ?
        GROUP BY 
            a.employee_id
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("iss", $employee_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode([
            'total_hours' => $row['total_worked_hours'],
            'overtime' => $row['overtime_hours'],
            'total_salary' => $row['total_salary']
        ]);
    } else {
        echo json_encode(['error' => 'هیچ داده‌ای یافت نشد']);
    }

    $stmt->close();
    $conn->close();
}
?>
