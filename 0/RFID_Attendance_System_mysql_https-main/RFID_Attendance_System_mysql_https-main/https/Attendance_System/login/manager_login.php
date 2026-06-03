<?php
// login.php

session_start(); // شروع جلسه

include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $name = htmlspecialchars(trim($_POST['name']));
    $email = htmlspecialchars(trim($_POST['email']));
    $password = $_POST['password'];

    // بررسی اینکه آیا کلید 'role' در داده‌های POST موجود است و اگر نه، یک مقدار پیش‌فرض تنظیم شود
    $role = isset($_POST['role']) ? $_POST['role'] : null; // پیش‌فرض به null در صورت عدم وجود role

    // بررسی اینکه آیا role ارسال شده است
    if ($role === null) {
        header("Location: index.php?error=Role is required.");
        exit();
    }

    // ابتدا پاک‌سازی نشست قبلی (در صورت ورود مجدد)
    session_unset(); // پاک‌سازی تمام داده‌های نشست
    session_destroy(); // پایان دادن به نشست جاری

    // شروع نشست جدید
    session_start();

    // تنظیم متغیرهای نشست جدید
    $_SESSION['name'] = $name;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = $role;  // ذخیره نقش در نشست

    // جستجو در جدول مدیران
    $query = "SELECT * FROM SystemManagers WHERE username = ? AND email = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ss", $name, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $manager = $result->fetch_assoc();
        
        // بررسی رمز عبور
        if ($manager['password'] === $password) { // بررسی مستقیم رمز عبور
            $_SESSION['user_id'] = $manager['manager_id'];

            // بررسی نقش و هدایت به داشبورد مربوطه
            if ($role === 'manager') {
                header("Location: manager_dashboard.php");
            } elseif ($role === 'senior_manager') {
                header("Location: senior_manager_dashboard.php");
            } else {
                header("Location: index.php?error=Invalid role.");
            }
            exit();
        } else {
            header("Location: index.php?error=Invalid credentials.");
            exit();
        }
    } else {
        // اگر کاربری یافت نشد
        header("Location: index.php?error=User not found.");
        exit();
    }

    $stmt->close();
}
?>
