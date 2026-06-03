<?php
// Make sure the session is started at the beginning of the page
session_start();

// Check if the user is logged in (session is active)
if (!isset($_SESSION['user_id'])) {
    // Redirect to the login page if no session exists
    header("Location: index.php");
    exit();
}

// Assuming the database connection is already included
include 'config.php';

// Fetch the user data from the database based on the session user_id
$user_id = $_SESSION['user_id'];
$query = "SELECT * FROM Employees WHERE employee_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

// Check if the user exists in the database
if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
} else {
    // Redirect to login if user is not found
    header("Location: index.php");
    exit();
}

// Fetch vacation reports for the logged-in user, including the "منتظر تایید" status
$vacation_query = "SELECT * FROM vacation_reports WHERE employee_id = ? AND (approval_status = 'تایید شده' OR approval_status = 'رد شده' OR approval_status = 'منتظر تایید')";
$vacation_stmt = $conn->prepare($vacation_query);
$vacation_stmt->bind_param("i", $user_id);
$vacation_stmt->execute();
$vacation_result = $vacation_stmt->get_result();

// Fetch overtime reports for the logged-in user, including the "منتظر تایید" status
$overtime_query = "SELECT * FROM OvertimeRequests WHERE employee_id = ? AND (approval_status = 'تایید شده' OR approval_status = 'رد شده' OR approval_status = 'منتظر تایید')";
$overtime_stmt = $conn->prepare($overtime_query);
$overtime_stmt->bind_param("i", $user_id);
$overtime_stmt->execute();
$overtime_result = $overtime_stmt->get_result();
?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>گزارش‌های مرخصی و اضافه‌کاری</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>

    <div class="dashboard">
        <h2>گزارش‌های مرخصی</h2>
        <table id="vacationTable">
            <thead>
                <tr>
                    <th>تاریخ مرخصی</th>
                    <th>نوع مرخصی</th>
                    <th>وضعیت تایید</th>
                    <th>تاریخ شروع</th>
                    <th>تاریخ پایان</th>
                    <th>دلیل</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($vacation = $vacation_result->fetch_assoc()) { 
                    // حذف فاصله‌های اضافی از مقدار وضعیت تایید
                    $approval_status = trim($vacation['approval_status']); 

                    // تعیین رنگ بر اساس وضعیت تایید
                    $status_color = '';
                    if ($approval_status == 'تایید شده') {
                        $status_color = 'green'; // سبز برای تایید شده
                    } elseif ($approval_status == 'رد شده') {
                        $status_color = 'red'; // قرمز برای رد شده
                    } elseif ($approval_status == 'منتظر تایید') {
                        $status_color = 'gray'; // خاکی برای منتظر تایید
                    } else {
                        $status_color = 'gray'; // خاکی برای وضعیت‌های دیگر
                    }


                ?>
                    <tr>
                        <td><?php echo $vacation['vacation_date']; ?></td>
                        <td><?php echo $vacation['vacation_type']; ?></td>
                        <td style="color: <?php echo $status_color; ?>;"><?php echo $vacation['approval_status']; ?></td>
                        <td><?php echo $vacation['start_date']; ?></td>
                        <td><?php echo $vacation['end_date']; ?></td>
                        <td><?php echo $vacation['reason']; ?></td>
                    </tr>
                <?php } ?>
            </tbody>
        </table>

        <h2>گزارش‌های اضافه‌کاری</h2>
        <table id="overtimeTable">
            <thead>
                <tr>
                    <th>تاریخ اضافه‌کاری</th>
                    <th>ساعات اضافه‌کاری</th>
                    <th>دلیل</th>
                    <th>وضعیت تایید</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($overtime = $overtime_result->fetch_assoc()) { 
                    // حذف فاصله‌های اضافی از مقدار وضعیت تایید
                    $approval_status = trim($overtime['approval_status']); 

                    // تعیین رنگ بر اساس وضعیت تایید
                    $status_color = '';
                    if ($approval_status == 'تایید شده') {
                        $status_color = 'green'; // سبز برای تایید شده
                    } elseif ($approval_status == 'رد شده') {
                        $status_color = 'red'; // قرمز برای رد شده
                    } elseif ($approval_status == 'منتظر تایید') {
                        $status_color = 'gray'; // خاکی برای منتظر تایید
                    } else {
                        $status_color = 'gray'; // خاکی برای وضعیت‌های دیگر
                    }


                ?>
                    <tr>
                        <td><?php echo $overtime['overtime_date']; ?></td>
                        <td><?php echo $overtime['overtime_hours']; ?></td>
                        <td><?php echo $overtime['reason']; ?></td>
                        <td style="color: <?php echo $status_color; ?>;"><?php echo $overtime['approval_status']; ?></td>
                    </tr>
                <?php } ?>
            </tbody>
        </table>
    </div>

</body>
</html>
