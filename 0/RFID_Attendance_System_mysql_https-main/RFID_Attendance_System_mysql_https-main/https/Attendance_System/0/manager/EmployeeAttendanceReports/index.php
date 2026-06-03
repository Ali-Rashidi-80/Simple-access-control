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
            <a href="/Attendance_System/login/dashboard.php" class="logout-button">داشبورد</a>
        </div>
    </div>

    <div class="logo-container">
        <img src="1.jpg" class="logo" alt="Logo">
    </div>

    <div class="panel">
        <input type="text" id="searchInput" placeholder="جستجو با نام، نام خانوادگی یا شماره ملی" oninput="updateTable()" style="width: 100%; padding: 10px; margin-bottom: 20px;">
        <table id="reportTable">
            <thead>
                <tr>
                    <th>تاریخ خروج</th>
                    <th>تاریخ ورود</th>
                    <th>وضعیت</th>
                    <th>تاریخ استخدام</th>
                    <th>سمت شغلی</th>
                    <th>بخش کار کارمند</th>
                    <th>نام کارمند</th>
                    <th>شماره ملی کارمند</th>
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
                        tableBody.innerHTML = '<tr><td colspan="9">هیچ داده‌ای برای نمایش وجود ندارد.</td></tr>';
                    } else {
                        data.forEach(function(row) {
                            var tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${row.exit_time || 'ندارد'}</td>
                                <td>${row.entry_time || 'ندارد'}</td>
                                <td class="${row.status_class}">${row.status_text}</td>
                                <td>${row.employment_date}</td>
                                <td>${row.job_title}</td>
                                <td>${row.department}</td>
                                <td>${row.name}</td>
                                <td>${row.national_number}</td>
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

        // به‌روزرسانی جدول هر 2 ثانیه
        setInterval(updateTable, 1000);

        // بارگذاری اولیه جدول
        updateTable();
    </script>
</body>
</html>
