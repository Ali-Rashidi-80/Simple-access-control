<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
    <title>پنل گزارش‌ها</title>
    <style>
        body {
            font-family: Tahoma, sans-serif;
            direction: rtl; /* راست‌چین کردن صفحه */
            text-align: right; /* راست‌چین کردن متن‌ها */
            background-color: #f4f4f4;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: right; /* راست‌چین کردن محتوای سلول‌ها */
        }
        th {
            background-color: #f2f2f2;
        }
        h2 {
            color: #333;
            margin-top: 20px;
        }
        .container {
            margin: 30px;
            background-color: white;
            padding: 20px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- گزارش تأخیرات -->
        <h2>گزارش تأخیرات</h2>
        <table>
            <thead>
                <tr>
                    <th>نام</th>
                    <th>تاریخ</th>
                    <th>زمان ورود</th>
                    <th>زمان خروج</th>
                    <th>وضعیت</th>
                    <th>مدت تأخیر</th>
                </tr>
            </thead>
            <tbody>
                <?php
                include 'config.php'; // اتصال به دیتابیس
                $query = "SELECT Full_name, date, check_in_time, check_out_time, 
                          IF(TIMEDIFF(check_in_time, '08:15:00') > 0, 'دیر آمد', 'به موقع') AS وضعیت,
                          IF(TIMEDIFF(check_in_time, '08:15:00') > 0, TIMEDIFF(check_in_time, '08:15:00'), '00:00:00') AS delay_duration
                          FROM EmployeeAttendanceReports
                          WHERE io = 0";
                $result = mysqli_query($conn, $query);
                while ($row = mysqli_fetch_assoc($result)) {
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
                            <td>{$row['وضعیت']}</td>
                            <td>{$delay_text}</td>
                          </tr>";
                }
                ?>
            </tbody>
        </table>

        <!-- گزارش مرخصی‌ها -->
        <h2>گزارش مرخصی‌ها</h2>
        <table>
            <thead>
                <tr>
                    <th>نام</th>
                    <th>تاریخ مرخصی</th>
                    <th>نوع مرخصی</th>
                    <th>وضعیت تایید</th>
                    <th>موجودی مرخصی</th> 
                </tr>
            </thead>
            <tbody>
                <?php
                $query = "SELECT e.Full_name, v.vacation_date, v.vacation_type, v.approval_status, e.vacation_balance
                          FROM vacation_reports v
                          JOIN EmployeeAttendanceReports e ON e.employee_id = v.employee_id";
                $result = mysqli_query($conn, $query);
                while ($row = mysqli_fetch_assoc($result)) {
                    echo "<tr>
                            <td>{$row['Full_name']}</td>
                            <td>{$row['vacation_date']}</td>
                            <td>{$row['vacation_type']}</td>
                            <td>{$row['approval_status']}</td>
                            <td>{$row['vacation_balance']}</td> <!-- نمایش موجودی مرخصی -->
                          </tr>";
                }
                ?>
            </tbody>
        </table>

        <!-- گزارش اضافه کاری‌ها -->
        <h2>گزارش اضافه کاری‌ها</h2>
        <table>
            <thead>
                <tr>
                    <th>نام</th>
                    <th>تاریخ اضافه کاری</th>
                    <th>ساعات اضافه کاری</th>
                    <th>وضعیت تایید</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $query = "SELECT e.Full_name, o.overtime_date, o.overtime_hours, o.approval_status
                          FROM OvertimeRequests o
                          JOIN EmployeeAttendanceReports e ON e.employee_id = o.employee_id";
                $result = mysqli_query($conn, $query);
                while ($row = mysqli_fetch_assoc($result)) {
                    echo "<tr>
                            <td>{$row['Full_name']}</td>
                            <td>{$row['overtime_date']}</td>
                            <td>{$row['overtime_hours']}</td>
                            <td>{$row['approval_status']}</td>
                          </tr>";
                }
                ?>
            </tbody>
        </table>
    </div>
</body>
</html>
