<?php
// ../user/فرم درخواست اضافه‌کاری/index.php

// اتصال به پایگاه داده
include 'config.php'; 

// فرض می‌کنیم که شناسه کاربر فعال در متغیر session ذخیره شده است
session_start();
$active_user_id = $_SESSION['user_id'];  // شناسه کاربری که در نشست است

// گرفتن نام کارمند با استفاده از شناسه کاربری فعال
$sql = "SELECT Full_name FROM EmployeeAttendanceReports WHERE employee_id = '$active_user_id' LIMIT 1";
$result = $conn->query($sql);

// بررسی موفقیت اجرای کوئری
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $active_user_name = $row['Full_name'];  // نام کارمند فعال
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فرم درخواست مرخصی</title>
    <link rel="stylesheet" href="styles.css">
    
    <!-- اضافه کردن فایل‌های CSS برای Persian DatePicker -->
    <link rel="stylesheet" href="persianDatepicker-master/css/persianDatepicker-default.css">
    
    <!-- اضافه کردن jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- اضافه کردن فایل‌های JS برای Persian DatePicker -->
    <script src="persianDatepicker-master/js/persianDatepicker.js"></script>
    
    <script>
        $(document).ready(function() {
            // فعال کردن Persian Date Picker برای ورودی تاریخ مرخصی
            $('#vacation_date').persianDatepicker({
                format: 'YYYY/MM/DD', // فرمت تاریخ
                autoClose: true, // بستن خودکار بعد از انتخاب تاریخ
                initialValue: false, // غیرفعال کردن مقدار پیش‌فرض
                observer: true, // مشاهده تغییرات در تاریخ
            });

            // فعال کردن Persian Date Picker برای ورودی تاریخ شروع
            $('#start_date').persianDatepicker({
                format: 'YYYY/MM/DD HH:mm', // فرمت تاریخ و زمان
                autoClose: true,
                initialValue: false,
                observer: true,
            });

            // فعال کردن Persian Date Picker برای ورودی تاریخ پایان
            $('#end_date').persianDatepicker({
                format: 'YYYY/MM/DD HH:mm', // فرمت تاریخ و زمان
                autoClose: true,
                initialValue: false,
                observer: true,
            });

            // ارسال فرم با استفاده از AJAX
            $('form').on('submit', function(event) {
                event.preventDefault(); // جلوگیری از ارسال فرم به‌طور معمول

                // جمع‌آوری داده‌های فرم
                var formData = $(this).serialize();

                // ارسال درخواست به PHP با استفاده از AJAX
                $.ajax({
                    type: 'POST',
                    url: 'data.php',  // آدرس فایل PHP که داده‌ها را پردازش می‌کند
                    data: formData,
                    success: function(response) {
                        // نمایش پیام موفقیت
                        $('#success-message').html(response).show();

                        // محو شدن پیام بعد از 5 ثانیه
                        setTimeout(function() {
                            $('#success-message').fadeOut();
                        }, 5000); // 5000 میلی‌ثانیه (5 ثانیه)
                    },
                    error: function() {
                        $('#success-message').html('خطا در ارسال درخواست.').show();

                        // محو شدن پیام بعد از 5 ثانیه در صورت خطا
                        setTimeout(function() {
                            $('#success-message').fadeOut();
                        }, 5000); // 5000 میلی‌ثانیه (5 ثانیه)
                    }
                });
            });
        });
    </script>
</head>
<body>
    <div class="form-container">
        <h2>فرم درخواست مرخصی</h2>
        <form>
            <!-- فیلد نام کارمند نمایش داده شده از دیتابیس -->
            <label for="employee_id">نام کارمند:</label>
            <input type="text" id="employee_id" name="employee_id" value="<?php echo $active_user_name; ?>" readonly required>

            <label for="vacation_date">تاریخ مرخصی:</label>
            <input type="text" id="vacation_date" name="vacation_date" required>
            
            <label for="vacation_type">نوع مرخصی:</label>
            <select id="vacation_type" name="vacation_type" required>
                <option value="استحقاقی">استحقاقی</option>
                <option value="استعلاجی">استعلاجی</option>
                <option value="بدون حقوق">بدون حقوق</option>
            </select>

            <label for="start_date">زمان شروع:</label>
            <input type="text" id="start_date" name="start_date" required>

            <label for="end_date">زمان پایان:</label>
            <input type="text" id="end_date" name="end_date" required>

            <label for="reason">دلیل درخواست مرخصی:</label>
            <textarea id="reason" name="reason" rows="4" placeholder="دلیل مرخصی را وارد کنید..." required></textarea>

            <div class="form-actions">
                <button type="submit" class="submit-btn">ارسال درخواست</button>
                <button type="reset" class="reset-btn">پاک کردن</button>
            </div>
        </form>

        <!-- نمایش پیام موفقیت -->
        <div id="success-message" style="display:none; color: green; padding: 10px; border: 1px solid green; margin-top: 10px;">
            درخواست مرخصی با موفقیت ثبت شد.
        </div>
    </div>
</body>
</html>
