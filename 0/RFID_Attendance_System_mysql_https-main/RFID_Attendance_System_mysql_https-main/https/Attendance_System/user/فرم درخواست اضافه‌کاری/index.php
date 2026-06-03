<?php
// ../user/فرم درخواست اضافه‌کاری/index.php

// اتصال به پایگاه داده
include 'config.php'; 

// فرض می‌کنیم که شناسه کاربر فعال در متغیر session ذخیره شده است
session_start();
$active_user_id = $_SESSION['user_id'];  // شناسه کاربری که در نشست است

// گرفتن نام کارمند و موجودی مرخصی با استفاده از شناسه کاربری فعال
$sql = "SELECT Full_name, vacation_balance FROM EmployeeAttendanceReports WHERE employee_id = '$active_user_id' LIMIT 1";
$result = $conn->query($sql);

// بررسی موفقیت اجرای کوئری
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $active_user_name = $row['Full_name'];  // نام کارمند فعال
    $vacation_balance = $row['vacation_balance'];  // موجودی مرخصی کاربر
} else {
    echo "اطلاعات کاربر یافت نشد.";
    exit();
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فرم درخواست اضافه‌کاری</title>
    <link rel="stylesheet" href="styles.css">
    
    <!-- اضافه کردن فایل‌های CSS برای Persian DatePicker -->
    <link rel="stylesheet" href="persianDatepicker-master/css/persianDatepicker-default.css">
    
    <!-- اضافه کردن jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- اضافه کردن فایل‌های JS برای Persian DatePicker -->
    <script src="persianDatepicker-master/js/persianDatepicker.js"></script>
    
    <script>
        $(document).ready(function() {
            // فعال کردن Persian Date Picker برای ورودی تاریخ اضافه‌کاری
            $('#overtime_date').persianDatepicker({
                format: 'YYYY/MM/DD', // فرمت تاریخ
                autoClose: true, // بستن خودکار بعد از انتخاب تاریخ
                initialValue: false, // غیرفعال کردن مقدار پیش‌فرض
                observer: true, // مشاهده تغییرات در تاریخ
            });

            // بررسی موجودی مرخصی قبل از ارسال فرم
            var vacation_balance = <?php echo $vacation_balance; ?>;
            if (vacation_balance <= 0) {
                $('#success-message').html('موجودی مرخصی شما صفر است و قادر به ارسال درخواست نیستید.').show();
                $('.submit-btn').prop('disabled', true);  // غیرفعال کردن دکمه ارسال درخواست
            }

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
        <h2>فرم درخواست اضافه‌کاری</h2>
        <form>
            <!-- فیلد نام کارمند فقط برای کاربر فعالی که در نشست است -->
            <label for="employee_id">نام کارمند:</label>
            <input type="text" id="employee_id" name="employee_id" value="<?php echo $active_user_name; ?>" readonly>

            <label for="overtime_date">تاریخ درخواست:</label>
            <input type="text" id="overtime_date" name="overtime_date" required>
            
            <label for="overtime_hours">ساعات اضافه‌کاری:</label>
            <input type="number" id="overtime_hours" name="overtime_hours" min="1" required>
            
            <label for="reason">دلیل درخواست اضافه‌کاری:</label>
            <textarea id="reason" name="reason" rows="4" placeholder="دلیل اضافه‌کاری را وارد کنید..." required></textarea>

            <div class="form-actions">
                <button type="submit" class="submit-btn">ارسال درخواست</button>
                <button type="reset" class="reset-btn">پاک کردن</button>
            </div>
        </form>

        <!-- نمایش پیام موفقیت -->
        <div id="success-message" style="display:none; color: green; padding: 10px; border: 1px solid green; margin-top: 10px;">
            درخواست اضافه‌کاری با موفقیت ثبت شد.
        </div>
    </div>
</body>
</html>
