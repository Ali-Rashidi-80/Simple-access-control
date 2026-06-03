$(document).ready(function() {
    // بارگذاری گزارش تأخیرات
    loadAttendanceReport();
    // بارگذاری گزارش مرخصی ها
    loadVacationReport();
    // بارگذاری گزارش اضافه کاری ها
    loadOvertimeReport();
    
    function loadAttendanceReport() {
        $.ajax({
            url: 'fetch_reports.php',
            method: 'GET',
            data: { type: 'attendance' },
            success: function(response) {
                $('#attendance-data').html(response);
            }
        });
    }

    function loadVacationReport() {
        $.ajax({
            url: 'fetch_reports.php',
            method: 'GET',
            data: { type: 'vacation' },
            success: function(response) {
                $('#vacation-data').html(response);
            }
        });
    }

    function loadOvertimeReport() {
        $.ajax({
            url: 'fetch_reports.php',
            method: 'GET',
            data: { type: 'overtime' },
            success: function(response) {
                $('#overtime-data').html(response);
            }
        });
    }
});
