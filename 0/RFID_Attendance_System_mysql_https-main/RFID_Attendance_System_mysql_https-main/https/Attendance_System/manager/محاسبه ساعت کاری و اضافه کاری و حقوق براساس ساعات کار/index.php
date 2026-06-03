<?php
// شامل فایل بررسی نشست
include 'session_check.php'; 

// اتصال به پایگاه داده
include 'config.php'; 

// بارگذاری اطلاعات کاربر
$user_id = $_SESSION['user_id'];
$query = "SELECT * FROM users WHERE id = ?";
$stmt = $conn->prepare($query);
if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
    } else {
        // در صورتی که کاربر در پایگاه داده یافت نشد
        header("Location: index.php?error=User not found.");
        exit();
    }
    $stmt->close();
} else {
    // اگر آماده‌سازی کوئری شکست خورد
    header("Location: index.php?error=Failed to prepare statement.");
    exit();
}
?>







<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>محاسبه ساعات کاری و حقوق</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h2>فرم محاسبه ساعت کاری و حقوق</h2>
        <form id="workForm">
            <label for="employee_name">نام کارمند:</label>
            <select id="employee_name" name="employee_name" required>
                <option value="">انتخاب کنید</option>
            </select>

            <label for="start_date">تاریخ شروع:</label>
            <input type="date" id="start_date" name="start_date" required>

            <label for="end_date">تاریخ پایان:</label>
            <input type="date" id="end_date" name="end_date" required>

            <button type="submit">محاسبه</button>
        </form>

        <div id="result">
            <p>ساعات کاری: <span id="total_hours"></span></p>
            <p>اضافه‌کاری: <span id="overtime"></span></p>
            <p>حقوق کل: <span id="total_salary"></span></p>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
