<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <title>گزارش‌های حضور و غیاب</title>
    <link rel="stylesheet" type="text/css" href="persianDatepicker-master/css/persianDatepicker-default.css">
    <link rel="stylesheet" type="text/css" href="style.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="persianDatepicker-master/js/persianDatepicker.js"></script>
</head>
<body>
    <div class="container">
        <h1>گزارش‌های حضور و غیاب هفتگی و ماهانه و سالانه</h1>
        <div class="date-select">
            <label for="start_date">تاریخ شروع:</label>
            <input type="text" id="start_date" class="persian-datepicker">
            
            <label for="end_date">تاریخ پایان:</label>
            <input type="text" id="end_date" class="persian-datepicker">
            
            <button onclick="generateReport()">تولید گزارش</button>
        </div>

        <div id="report-section">
            <table>
                <thead>
                    <tr>
                        <th>RFID</th>
                        <th>نام کارمند</th>
                        <th>تاریخ ورود</th>
                        <th>تاریخ خروج</th>
                        <th>تاریخ</th>
                    </tr>
                </thead>
                <tbody id="report-tbody">
                </tbody>
            </table>
        </div>
    </div>

    <script>
        $(document).ready(function () {
            $('#start_date, #end_date').persianDatepicker({
                format: 'YYYY/MM/DD',
                autoClose: true,
                observer: true,
            });
        });

        function generateReport() {
    const startDate = $('#start_date').val();
    const endDate = $('#end_date').val();

    if (!startDate || !endDate) {
        alert('لطفاً تاریخ شروع و پایان را وارد کنید.');
        return;
    }

    $.ajax({
        url: 'data.php',
        type: 'GET',
        data: { start_date: startDate, end_date: endDate },
        dataType: 'json',
        success: function (data) {
            const tbody = $('#report-tbody');
            tbody.empty();

            if (data.length === 0) {
                tbody.append('<tr><td colspan="5">هیچ داده‌ای یافت نشد.</td></tr>');
                return;
            }

            data.forEach(item => {
                const row = `
                    <tr>
                        <td>${item.rfid_uid}</td>
                        <td>${item.Full_name}</td> <!-- نام کارمند جدید -->
                        <td>${item.check_in_time}</td>
                        <td>${item.check_out_time}</td>
                        <td>${item.log_date}</td>
                    </tr>
                `;
                tbody.append(row);
            });
        },
        error: function () {
            alert('خطا در دریافت داده‌ها. لطفاً دوباره تلاش کنید.');
        }
    });
}

    </script>
</body>
</html>
