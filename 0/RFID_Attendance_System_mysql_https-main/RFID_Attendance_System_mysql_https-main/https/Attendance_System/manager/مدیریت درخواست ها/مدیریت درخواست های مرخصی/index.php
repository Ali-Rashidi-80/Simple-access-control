<?php
// اتصال به پایگاه داده
include 'config.php'; 

// گرفتن درخواست‌های مرخصی با JOIN برای نمایش نام کارمند
$sql = "SELECT vacation_reports.*, EmployeeAttendanceReports.Full_name 
        FROM vacation_reports
        JOIN EmployeeAttendanceReports ON vacation_reports.employee_id = EmployeeAttendanceReports.employee_id
        WHERE approval_status = 'منتظر تایید'"; 
$result = $conn->query($sql);

// بررسی موفقیت اجرای کوئری
if ($result->num_rows > 0) {
    // ذخیره درخواست‌ها در متغیر $requests
    $requests = [];
    while($row = $result->fetch_assoc()) {
        $requests[] = $row;
    }
} else {
    $requests = []; // در صورت عدم وجود درخواست‌ها، آرایه خالی به $requests اختصاص می‌دهیم
}

$conn->close();

?>

<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مدیریت درخواست‌های مرخصی</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>
    <div class="form-container">
        <h2>مدیریت درخواست‌های مرخصی</h2>
        
        <!-- پیام اعلان -->
        <div id="alert-message" style="display: none;" class="alert"></div>

        <?php if (count($requests) > 0): ?>
        <table class="requests-table">
            <thead>
                <tr>
                    <th>نام کارمند</th>
                    <th>تاریخ مرخصی</th>
                    <th>نوع مرخصی</th>
                    <th>زمان شروع</th>
                    <th>زمان پایان</th>
                    <th>دلیل درخواست</th>
                    <th>اقدام</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($requests as $request): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($request['Full_name']); ?></td> <!-- نمایش نام کارمند -->
                        <td><?php echo htmlspecialchars($request['vacation_date']); ?></td>
                        <td><?php echo htmlspecialchars($request['vacation_type']); ?></td>
                        <td><?php echo htmlspecialchars($request['start_date']); ?></td>
                        <td><?php echo htmlspecialchars($request['end_date']); ?></td>
                        <td><?php echo htmlspecialchars($request['reason']); ?></td>
                        <td>
                            <!-- دکمه‌های تایید و رد درخواست -->
                            <button class="approve-btn" data-id="<?php echo $request['vacation_id']; ?>" data-action="approve">تایید</button>
                            <button class="reject-btn" data-id="<?php echo $request['vacation_id']; ?>" data-action="reject">رد</button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php else: ?>
            <p>هیچ درخواستی برای تایید وجود ندارد.</p>
        <?php endif; ?>
    </div>

    <script>
        $(document).ready(function() {
            // تایید یا رد درخواست
            $('.approve-btn, .reject-btn').on('click', function() {
                var requestId = $(this).data('id');
                var action = $(this).data('action');
                
                // ارسال درخواست به PHP برای تغییر وضعیت
                $.ajax({
                    type: 'POST',
                    url: 'update_request.php',  // فایل PHP برای بروزرسانی درخواست
                    data: { id: requestId, action: action },
                    success: function(response) {
                        if (response == 'success') {
                            $('#alert-message').html('درخواست با موفقیت ' + (action === 'approve' ? 'تایید' : 'رد') + ' شد.').show().delay(3000).fadeOut();
                            // بروزرسانی داده‌ها به صورت Ajax
                            loadRequests();
                        } else {
                            $('#alert-message').html('خطا در بروزرسانی وضعیت درخواست.').show().delay(3000).fadeOut();
                        }
                    }
                });
            });

            // بارگذاری درخواست‌ها با Ajax
            function loadRequests() {
                $.ajax({
                    url: 'index.php', // صفحه اصلی که درخواست‌ها را بارگذاری می‌کند
                    success: function(data) {
                        $('body').html(data); // به‌روزرسانی محتوای صفحه
                    }
                });
            }
        });
    </script>
</body>
</html>
