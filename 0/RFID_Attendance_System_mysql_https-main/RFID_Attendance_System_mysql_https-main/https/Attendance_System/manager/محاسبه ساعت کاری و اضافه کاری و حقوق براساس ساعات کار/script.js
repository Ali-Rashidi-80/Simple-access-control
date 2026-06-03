document.addEventListener('DOMContentLoaded', function () {
    // بارگذاری لیست کارکنان از سرور
    fetch('get_employees.php')
    .then(response => response.json())
    .then(data => {
        const employeeSelect = document.getElementById('employee_name');
        if (data.error) {
            alert(data.error); // نمایش پیام خطا در صورت وجود
            return;
        }

        // اضافه کردن اسامی کارمندان به <select>
        data.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.employee_id;
            option.textContent = employee.full_name;
            employeeSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error fetching employee data:', error);
        alert('مشکلی در بارگذاری اسامی کارمندان وجود دارد.');
    });

    // ارسال فرم برای محاسبه اطلاعات
    document.getElementById('workForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const employeeId = document.getElementById('employee_name').value;
        const startDate = document.getElementById('start_date').value;
        const endDate = document.getElementById('end_date').value;

        const formData = new FormData();
        formData.append('employee_id', employeeId);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);

        fetch('calculate_salary.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error); // نمایش خطا در صورت عدم وجود داده
            } else {
                document.getElementById('total_hours').textContent = data.total_hours || '0';
                document.getElementById('overtime').textContent = data.overtime || '0';
                document.getElementById('total_salary').textContent = data.total_salary || '0';
            }
        })
        .catch(error => console.error('Error:', error));
    });
});
