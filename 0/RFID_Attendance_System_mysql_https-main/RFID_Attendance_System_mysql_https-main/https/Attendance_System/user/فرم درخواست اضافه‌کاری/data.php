<?php
include 'config.php';

// دریافت داده‌های ارسال‌شده از فرم
$employee_id = $_POST['employee_id'];
$overtime_date = $_POST['overtime_date'];
$overtime_hours = $_POST['overtime_hours'];
$reason = $_POST['reason'];

// ابتدا موجودی مرخصی کاربر را بررسی می‌کنیم
$sql_check_balance = "SELECT vacation_balance FROM EmployeeAttendanceReports WHERE employee_id = '$employee_id' LIMIT 1";
$result_check_balance = $conn->query($sql_check_balance);

// بررسی موفقیت اجرای کوئری
if ($result_check_balance->num_rows > 0) {
    $row = $result_check_balance->fetch_assoc();
    $vacation_balance = $row['vacation_balance']; // موجودی مرخصی کاربر

    // اگر موجودی مرخصی بیشتر از صفر باشد، درخواست را ثبت می‌کنیم
    if ($vacation_balance > 0) {
        // درج درخواست اضافه‌کاری در دیتابیس
        $sql_insert_request = "INSERT INTO OvertimeRequests (employee_id, overtime_date, overtime_hours, reason, approval_status) 
                               VALUES ('$employee_id', '$overtime_date', '$overtime_hours', '$reason', 'منتظر تایید')";

        if ($conn->query($sql_insert_request) === TRUE) {
            // کاهش موجودی مرخصی یک واحد
            $sql_update_balance = "UPDATE EmployeeAttendanceReports SET vacation_balance = vacation_balance - 1 
                                   WHERE employee_id = '$employee_id'";

            if ($conn->query($sql_update_balance) === TRUE) {
                echo "درخواست اضافه‌کاری با موفقیت ثبت شد.";
            } else {
                echo "خطا در به‌روزرسانی موجودی مرخصی: " . $conn->error;
            }
        } else {
            echo "خطا در ثبت درخواست: " . $conn->error;
        }
    } else {
        // اگر موجودی مرخصی صفر باشد
        echo "موجودی مرخصی شما صفر است. لطفاً درخواست مرخصی جدید ندهید.";
    }
} else {
    echo "خطا در دریافت موجودی مرخصی.";
}

$conn->close();
?>
