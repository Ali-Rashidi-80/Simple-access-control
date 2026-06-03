<?php
include_once 'jdf.php'; // اضافه کردن کتابخانه jdf

$servername = "185.94.98.252";
$dbname = "ewyjapml_Attendance_System"; 
$username = "ewyjapml";
$password = "aezakmiAEZAKMI790";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';

if ($start_date && $end_date) {
    // تبدیل تاریخ شمسی به میلادی
    $start_date_gregorian = jalali_to_gregorian(
        intval(explode('/', $start_date)[0]),
        intval(explode('/', $start_date)[1]),
        intval(explode('/', $start_date)[2]),
        '-'
    );

    $end_date_gregorian = jalali_to_gregorian(
        intval(explode('/', $end_date)[0]),
        intval(explode('/', $end_date)[1]),
        intval(explode('/', $end_date)[2]),
        '-'
    );

    // اصلاح کوئری SQL برای JOIN با جدول EmployeeAttendanceReports
    $sql = "SELECT 
                al.rfid_uid, 
                ear.Full_name, 
                al.check_in_time, 
                al.check_out_time, 
                al.log_date 
            FROM AttendanceLogs al
            JOIN EmployeeAttendanceReports ear ON al.rfid_uid = ear.rfid_uid
            WHERE al.log_date BETWEEN '$start_date_gregorian' AND '$end_date_gregorian'
            ORDER BY al.log_date DESC";

    $result = $conn->query($sql);

    $data = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // بررسی وضعیت تاریخ‌ها و جایگزینی کلمه نامشخص
            if ($row['check_in_time'] == 'نامشخص' && strtotime($row['log_date']) < time()) {
                $row['check_in_time'] = 'در حال کار';
            } elseif ($row['check_out_time'] == 'نامشخص' && strtotime($row['log_date']) > time()) {
                $row['check_out_time'] = 'شیفت در حال انجام';
            }

            $data[] = $row;
        }
    }

    echo json_encode($data);
} else {
    echo json_encode([]);
}

$conn->close();
?>
