<?php
// شروع جلسه
session_start();

// بررسی اینکه آیا کاربر لاگین کرده است یا خیر
if (!isset($_SESSION['user_id'])) {
    // اگر کاربر لاگین نکرده است، به صفحه لاگین هدایت می‌شود
    header("Location: /Attendance_System/login/index.php?error=Login required.");
    exit();
}

// تخریب نشست
session_unset(); // حذف تمام داده‌های نشست
session_destroy(); // تخریب نشست

// هدایت به صفحه ورود با پیام خروج موفق
header("Location: /Attendance_System/login/index.php?success=Logged out successfully.");
exit();
?>
