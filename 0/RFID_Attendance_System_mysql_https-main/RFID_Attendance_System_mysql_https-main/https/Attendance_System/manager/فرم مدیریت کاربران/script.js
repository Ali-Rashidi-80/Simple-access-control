document.addEventListener('DOMContentLoaded', function () {
    // بارگذاری لیست کارمندان
    loadEmployees();

    // ارسال فرم افزودن کارمند
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    addEmployeeForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const rfidUid = document.getElementById('rfidUid').value;
        const vacationBalance = document.getElementById('vacationBalance').value;

        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('rfidUid', rfidUid);
        formData.append('vacationBalance', vacationBalance);
        formData.append('action', 'add_employee');

        fetch('employee.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('کارمند با موفقیت اضافه شد');
                loadEmployees();
            } else {
                alert('خطا در افزودن کارمند');
            }
        });
    });
});

// بارگذاری لیست کارمندان
function loadEmployees() {
    fetch('employee.php?action=get_employees')
        .then(response => response.json())
        .then(data => {
            const employeeTable = document.getElementById('employeeTable').getElementsByTagName('tbody')[0];
            employeeTable.innerHTML = '';
            data.forEach(employee => {
                const row = employeeTable.insertRow();
                row.innerHTML = `
                    <td>${employee.Full_name}</td>
                    <td>${employee.rfid_uid}</td>
                    <td>${employee.vacation_balance}</td>
                    <td>
                        <button class="delete" onclick="deleteEmployee(${employee.report_id})">حذف</button>
                    </td>
                `;
            });
        });
}

// حذف کارمند
function deleteEmployee(reportId) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این کارمند را حذف کنید؟')) {
        const formData = new FormData();
        formData.append('reportId', reportId);
        formData.append('action', 'delete_employee');

        fetch('employee.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('کارمند با موفقیت حذف شد');
                loadEmployees();
            } else {
                alert('خطا در حذف کارمند');
            }
        });
    }
}
