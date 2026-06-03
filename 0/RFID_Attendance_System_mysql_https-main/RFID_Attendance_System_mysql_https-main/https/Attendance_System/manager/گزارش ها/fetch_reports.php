<?php
// load_reports.php

include 'config.php';

// ساختن کوئری‌ها برای سه گزارش

// دریافت نوع گزارش
$type = $_GET['type'];

if ($type == 'attendance') {
    $sql = "SELECT Full_name, date, check_in_time, check_out_time, 
            IF(TIMEDIFF(check_in_time, '08:15:00') > 0, 'دیر آمد', 'به موقع') AS status,
            IF(TIMEDIFF(check_in_time, '08:15:00') > 0, TIMEDIFF(check_in_time, '08:15:00'), '00:00:00') AS delay_duration
            FROM EmployeeAttendanceReports";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // استخراج ساعت و دقیقه تأخیر
            $delay = $row['delay_duration'];
            $delay_parts = explode(":", $delay);
            $hours = (int)$delay_parts[0];
            $minutes = (int)$delay_parts[1];

            // اگر تأخیر وجود نداشته باشد، نمایش "به موقع"
            $delay_text = $hours > 0 ? "{$hours} ساعت و {$minutes} دقیقه" : ($minutes > 0 ? "{$minutes} دقیقه" : "به موقع");

            echo "<tr>
                    <td>{$row['Full_name']}</td>
                    <td>{$row['date']}</td>
                    <td>{$row['check_in_time']}</td>
                    <td>{$row['check_out_time']}</td>
                    <td>{$row['status']}</td>
                    <td>{$delay_text}</td>
                  </tr>";
        }
    }
} elseif ($type == 'vacation') {
    $sql = "SELECT Full_name, vacation_date, vacation_type, approval_status FROM vacation_reports";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            echo "<tr>
                    <td>{$row['Full_name']}</td>
                    <td>{$row['vacation_date']}</td>
                    <td>{$row['vacation_type']}</td>
                    <td>{$row['approval_status']}</td>
                  </tr>";
        }
    }
} elseif ($type == 'overtime') {
    $sql = "SELECT Full_name, overtime_date, overtime_hours, approval_status FROM OvertimeRequests";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            echo "<tr>
                    <td>{$row['Full_name']}</td>
                    <td>{$row['overtime_date']}</td>
                    <td>{$row['overtime_hours']}</td>
                    <td>{$row['approval_status']}</td>
                  </tr>";
        }
    }
}

$conn->close();
?>
