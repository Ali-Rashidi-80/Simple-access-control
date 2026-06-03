<?php
// session_check.php
session_start();

// تنظیم زمان انقضای نشست به 30 دقیقه (1800 ثانیه)
$session_lifetime = 1800; // 30 دقیقه

// بررسی زمان آخرین فعالیت
if (isset($_SESSION['last_activity'])) {
    if (time() - $_SESSION['last_activity'] > $session_lifetime) {
        session_unset(); // حذف همه داده‌های نشست
        session_destroy(); // تخریب نشست
        header("Location: /Attendance_System/login/index.php?error=Session expired."); // هدایت به صفحه ورود
        exit();
    }
}

// بروزرسانی زمان آخرین فعالیت
$_SESSION['last_activity'] = time();

// بررسی اینکه آیا کاربر لاگین کرده است یا خیر
if (!isset($_SESSION['user_id'])) {
    // اگر کاربر لاگین نکرده است، به صفحه لاگین هدایت می‌شود
    header("Location: /Attendance_System/login/index.php?error=Login required.");
    exit();
}
?>
