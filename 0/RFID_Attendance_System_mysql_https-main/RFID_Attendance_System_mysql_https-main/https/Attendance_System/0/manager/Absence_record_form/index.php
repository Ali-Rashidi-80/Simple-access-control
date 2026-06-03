<?php
// اتصال به پایگاه داده
$servername = "185.94.98.252";
$dbname = "ewyjapml_Attendance_System";
$username = "ewyjapml";
$password = "aezakmiAEZAKMI790";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

// بررسی اتصال
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$message = ''; // متغیر برای ذخیره پیام

// بررسی اینکه آیا فرم ارسال شده است
if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    // دریافت اطلاعات فرم
    $user_name = isset($_POST['user_name']) ? $_POST['user_name'] : '';
    $date = isset($_POST['date']) ? $_POST['date'] : '';
    $reason = isset($_POST['reason']) ? $_POST['reason'] : '';
    $description = isset($_POST['description']) ? $_POST['description'] : '';

    // بررسی و اعتبارسنجی اطلاعات
    if (!empty($user_name) && !empty($date) && !empty($reason)) {
        // وارد کردن اطلاعات در پایگاه داده
        $sql = "INSERT INTO Absence_reason_table (user_name, date, reason_for_absence, Description) 
                VALUES ('$user_name', '$date', '$reason', '$description')";

        if ($conn->query($sql) === TRUE) {
            $message = "اطلاعات با موفقیت ثبت شد.";
        } else {
            $message = "خطا در ثبت اطلاعات: " . $conn->error;
        }
    } else {
        $message = "لطفاً تمام فیلدها را تکمیل کنید.";
    }
}

// بستن اتصال
$conn->close();
?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <title>گزارش ورود و خروج افراد</title>
    <link rel="stylesheet" type="text/css" href="style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
</head>
<body>

    <div class="header">
        <h1>فرم ثبت غیبت کارمند</h1>
        <div>
            <a href="/Attendance_System/login/logout.php" class="logout-button">خروج</a>
            <a href="/Attendance_System/login/dashboard.php" class="logout-button">داشبورد</a>
        </div>
    </div>

    <div class="logo-container">
        <img src="1.jpg" class="logo" alt="Logo">
    </div>

    <div class="panel">
        <form id="absenceForm" action="" method="POST">
            <label for="user_name">نام کاربر:</label>
            <select id="user_name" name="user_name" required>
                <option value="" disabled selected>انتخاب کاربر</option>
                <!-- اینجا باید کاربران به صورت داینامیک از پایگاه داده اضافه شوند -->
            </select>

            <label for="date">تاریخ:</label>
            <input type="date" id="date" name="date" required>

            <label for="reason">دلیل غیبت:</label>
            <select id="reason" name="reason" required>
                <option value="مرخصی">مرخصی</option>
                <option value="غیبت بدون اطلاع">غیبت بدون اطلاع</option>
                <option value="مأموریت">مأموریت</option>
            </select>

            <label for="description">توضیحات:</label>
            <textarea id="description" name="description" rows="4" cols="50" placeholder="توضیحات دلیل"></textarea>

            <button type="submit">ثبت غیبت</button>
        </form>
    </div>

    <script>
        // نمایش اعلان موفقیت یا خطا
        var message = <?php echo json_encode($message); ?>; // پیغام از PHP به جاوا اسکریپت منتقل می‌شود
        if (message) {
            alert(message); // نمایش پیام با استفاده از جاوا اسکریپت
        }

        // دریافت لیست کاربران از سرور
        function loadUsers() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'get_users.php', true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var users = JSON.parse(xhr.responseText);
                    var userSelect = document.getElementById('user_name');

                    users.forEach(function(user) {
                        var option = document.createElement('option');
                        option.value = user.name;
                        option.textContent = user.name;
                        userSelect.appendChild(option);
                    });
                }
            };
            xhr.send();
        }

        // فراخوانی تابع برای دریافت کاربران هنگام بارگذاری صفحه
        window.onload = loadUsers;
    </script>

</body>
</html>
