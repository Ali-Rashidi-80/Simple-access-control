<?php
// login.php

// اتصال به پایگاه داده
include 'config.php';

session_start();

// اطمینان از اینکه نشست قبلی حذف می‌شود
if (isset($_SESSION['user_id'])) {
    session_unset();     // پاک‌سازی متغیرهای نشست
    session_destroy();   // پایان دادن به نشست
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $password = $_POST['password'];

    // استعلام برای جستجوی ایمیل در پایگاه داده
    $query = "SELECT * FROM Employees WHERE email = ?";
    $stmt = $conn->prepare($query);
    if ($stmt) {
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // مقایسه پسورد به صورت ساده
            if ($password === $user['password']) {  // مقایسه پسورد وارد شده با پسورد ذخیره شده
                $_SESSION['username'] = $user['email'];  // ذخیره نام کاربری در نشست
                $_SESSION['user_id'] = $user['employee_id']; // ذخیره شناسه کاربر employee_id
                header("Location: /Attendance_System/login/user_dashboard.php");
                exit();
            } else {
                header("Location: index.php?error=Invalid password.");
                exit();
            }
        } else {
            header("Location: index.php?error=User not found.");
            exit();
        }
        $stmt->close();
    } else {
        header("Location: index.php?error=Failed to prepare statement.");
        exit();
    }
}
?>
