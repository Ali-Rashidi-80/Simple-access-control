<?php
// اتصال به پایگاه داده
include 'config.php'; 



if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $employee_id = isset($_POST['employee_id']) ? $_POST['employee_id'] : null;
    $vacation_date = $_POST['vacation_date'];
    $vacation_type = $_POST['vacation_type'];
    $start_date = $_POST['start_date'];
    $end_date = $_POST['end_date'];
    $reason = $_POST['reason'];

    $sql = "INSERT INTO vacation_reports (employee_id, vacation_date, vacation_type, start_date, end_date, reason, approval_status)
            VALUES ('$employee_id', '$vacation_date', '$vacation_type', '$start_date', '$end_date', '$reason', 'منتظر تایید')";

    if ($conn->query($sql) === TRUE) {
        echo "درخواست مرخصی با موفقیت ثبت شد";
    } else {
        echo "خطا در ثبت درخواست: " . $conn->error;
    }
}

$conn->close();
?>
