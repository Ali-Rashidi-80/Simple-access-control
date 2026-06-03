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
    <title>گزارش ورود و خروج افراد</title>
    <link rel="stylesheet" type="text/css" href="style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
</head>
<body>

    <div class="header">
        <h1>گزارش حضور و غیاب امروز</h1>
        <div>
            <a href="/Attendance_System/login/logout.php" class="logout-button">خروج</a>
            <a href="/Attendance_System/login/manager_dashboard.php" class="logout-button">داشبورد</a>

        </div>
    </div>

    <div class="logo-container">
        <img src="1.jpg" class="logo" alt="Logo">
    </div>

    <div class="panel">
        <input type="text" id="searchInput" placeholder="جستجو با نام یا شناسه کارت کارمند" oninput="updateTable()" style="width: 100%; padding: 10px; margin-bottom: 20px;">
        <table id="reportTable">
            <thead>
                <tr>
                    <th>تاریخ خروج</th>
                    <th>تاریخ ورود</th>
                    <th>وضعیت</th>
                    <th>نام کارمند</th>
                    <th>شناسه کارت کارمند</th>
                </tr>
            </thead>
            <tbody>
                <!-- اطلاعات جدول به صورت داینامیک اینجا نمایش داده می‌شود -->
            </tbody>
        </table>
    </div>

    <script>
        function updateTable() {
            var searchValue = document.getElementById('searchInput').value;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'data.php?search=' + encodeURIComponent(searchValue), true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var data = JSON.parse(xhr.responseText);
                    var tableBody = document.querySelector('#reportTable tbody');
                    tableBody.innerHTML = ''; // پاک کردن محتوای قبلی

                    if (data.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="5">هیچ داده‌ای برای نمایش وجود ندارد.</td></tr>';
                    } else {
                        data.forEach(function(row) {
                            var tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${row.exit_time || 'ندارد'}</td>
                                <td>${row.entry_time || 'ندارد'}</td>
                                <td class="${row.status_class}">${row.status_text}</td>
                                <td>${row.name}</td>
                                <td>${row.rfid}</td>
                            `;
                            tableBody.appendChild(tr);
                        });
                    }
                } else {
                    console.error("Error fetching data:", xhr.status, xhr.statusText);
                }
            };
            xhr.send();
        }

        
        setInterval(updateTable, 1000);

        // بارگذاری اولیه جدول
        updateTable();
    </script>
</body>
</html>
