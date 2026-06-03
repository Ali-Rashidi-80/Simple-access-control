<?php
include 'config.php';

// واکشی درخواست‌های منتظر تایید از دیتابیس
$sql = "SELECT OvertimeRequests.id, EmployeeAttendanceReports.Full_name, OvertimeRequests.overtime_date, OvertimeRequests.overtime_hours, OvertimeRequests.reason, OvertimeRequests.approval_status
        FROM OvertimeRequests
        JOIN EmployeeAttendanceReports ON OvertimeRequests.employee_id = EmployeeAttendanceReports.employee_id
        WHERE OvertimeRequests.approval_status = 'منتظر تایید'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo '<tr id="row-' . $row['id'] . '">';
        echo '<td>' . $row['Full_name'] . '</td>';
        echo '<td>' . $row['overtime_date'] . '</td>';
        echo '<td>' . $row['overtime_hours'] . ' ساعت</td>';
        echo '<td>' . $row['reason'] . '</td>';
        echo '<td id="status-' . $row['id'] . '">' . $row['approval_status'] . '</td>';
        echo '<td>';
        echo '<button class="approve-btn" data-id="' . $row['id'] . '">تایید</button>';
        echo '<button class="reject-btn" data-id="' . $row['id'] . '">رد</button>';
        echo '</td>';
        echo '</tr>';
    }
} else {
    echo '<tr><td colspan="6">درخواستی یافت نشد</td></tr>';
}

$conn->close();
?>
