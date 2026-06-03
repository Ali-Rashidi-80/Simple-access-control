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
    <title>مدیریت کارمندان</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>مدیریت کارمندان</h1>

        <!-- فرم افزودن کارمند جدید -->
        <div class="add-employee-form">
            <h2>افزودن کارمند جدید</h2>
            <form id="addEmployeeForm">
                <label for="fullName">نام کامل</label>
                <input type="text" id="fullName" name="fullName" required>
                
                <label for="rfidUid">کد RFID</label>
                <input type="text" id="rfidUid" name="rfidUid" required>
                
                <label for="vacationBalance">موجودی مرخصی</label>
                <input type="number" id="vacationBalance" name="vacationBalance" required>
                
                <button type="submit">افزودن کارمند</button>
            </form>
        </div>

        <!-- لیست کارمندان -->
        <div class="employee-list">
            <h2>لیست کارمندان</h2>
            <table id="employeeTable">
                <thead>
                    <tr>
                        <th>نام</th>
                        <th>کد RFID</th>
                        <th>موجودی مرخصی</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- اطلاعات کارمندان در اینجا بارگذاری می‌شود -->
                </tbody>
            </table>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
