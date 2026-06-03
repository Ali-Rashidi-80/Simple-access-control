<?php
// اتصال به پایگاه داده
include 'config.php';
?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مدیریت درخواست‌های اضافه‌کاری</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        $(document).ready(function () {
            // تابع به‌روزرسانی جدول
            function fetchRequests() {
                $.ajax({
                    type: 'GET',
                    url: 'fetch_requests.php',
                    success: function (response) {
                        $('#requests-table tbody').html(response); // بروزرسانی محتوای جدول
                    },
                    error: function () {
                        console.error('خطا در واکشی درخواست‌ها');
                    }
                });
            }

            // فراخوانی تابع fetchRequests هر ۲ ثانیه
            setInterval(fetchRequests, 2000);

            // تایید درخواست
            $(document).on('click', '.approve-btn', function () {
                var requestId = $(this).data('id');
                updateApprovalStatus(requestId, 'تایید شده');
            });

            // رد درخواست
            $(document).on('click', '.reject-btn', function () {
                var requestId = $(this).data('id');
                updateApprovalStatus(requestId, 'رد شده');
            });

            // تابع به‌روزرسانی وضعیت درخواست
            function updateApprovalStatus(requestId, status) {
                $.ajax({
                    type: 'POST',
                    url: 'update_request.php',
                    data: { id: requestId, status: status },
                    success: function (response) {
                        if (response === 'success') {
                            alert('وضعیت با موفقیت به‌روزرسانی شد');
                        } else {
                            alert('خطا در به‌روزرسانی وضعیت');
                        }
                        fetchRequests(); // بروزرسانی جدول بعد از تغییر وضعیت
                    },
                    error: function () {
                        alert('خطا در برقراری ارتباط با سرور');
                    }
                });
            }

            // اولین بار واکشی درخواست‌ها
            fetchRequests();
        });
    </script>
</head>
<body>
    <div class="requests-container">
        <h2>مدیریت درخواست‌های اضافه‌کاری</h2>
        <table id="requests-table">
            <thead>
                <tr>
                    <th>نام کارمند</th>
                    <th>تاریخ درخواست</th>
                    <th>ساعات اضافه‌کاری</th>
                    <th>دلیل درخواست</th>
                    <th>وضعیت تایید</th>
                    <th>عملیات</th>
                </tr>
            </thead>
            <tbody>
                <!-- محتوای جدول از طریق AJAX بارگذاری می‌شود -->
            </tbody>
        </table>
    </div>
</body>
</html>
