<?php
// اتصال به پایگاه داده
$servername = "185.94.98.252";
$dbname = "ewyjapml_Attendance_System"; 
$username = "ewyjapml";
$password = "aezakmiAEZAKMI790";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// بررسی نوع درخواست
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // دریافت اطلاعات کارت از طریق POST
    $card_id = isset($_POST['id']) ? $conn->real_escape_string($_POST['id']) : '';
    
    // بررسی اینکه آیا کارت وجود دارد
    $sql = "SELECT * FROM User_table WHERE rfid_uid = '$card_id'";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $current_status = $row['io'];
        $current_time = date('Y-m-d H:i:s'); // زمان فعلی

        // بروزرسانی وضعیت (داخل یا خارج) و تاریخ‌ها
        if ($current_status == '1') {
            // اگر کاربر داخل است، تاریخ خروج را به‌روزرسانی کنید
            $update_sql = "UPDATE User_table SET io = '0', exit_time = '$current_time' WHERE rfid_uid = '$card_id'";
            $status_message = "User exited.";
        } else {
            // اگر کاربر خارج است، تاریخ ورود و وضعیت را به‌روزرسانی کنید
            $update_sql = "UPDATE User_table SET io = '1', entry_time = '$current_time' WHERE rfid_uid = '$card_id'";
            $status_message = "User entered.";
        }

        if ($conn->query($update_sql) === TRUE) {
            echo $status_message;
        } else {
            echo "Error updating status: " . $conn->error;
        }
    } else {
        // اگر کاربر وجود ندارد، رکورد جدید اضافه کنید
        $current_time = date('Y-m-d H:i:s'); // زمان فعلی
        $insert_sql = "INSERT INTO User_table (rfid_uid, io, entry_time) VALUES ('$card_id', '1', '$current_time')";
        
        if ($conn->query($insert_sql) === TRUE) {
            echo "New user added with ID: $card_id";
        } else {
            echo "Error adding user: " . $conn->error;
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // کد قبلی مربوط به جستجوی کاربران
    $search = isset($_GET['search']) ? $conn->real_escape_string($_GET['search']) : '';

    $sql = "SELECT * FROM User_table WHERE 
            (Frist_Name LIKE '%$search%' OR 
             Last_Name LIKE '%$search%' OR 
             `National number` LIKE '%$search%')";
    $result = $conn->query($sql);

    $data = [];

    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $status_text = ($row['io'] == '1') ? 'داخل' : 'خارج';
            $status_class = ($row['io'] == '1') ? 'status-in' : 'status-out';
            $data[] = [
                'rfid' => $row['rfid_uid'],
                'name' => $row['Frist_Name'] . ' ' . $row['Last_Name'],
                'national_number' => $row['National number'],
                'job_title' => $row['job_title'],
                'department' => $row['department'],
                'employment_date' => $row['employment_date'],
                'entry_time' => $row['entry_time'] ?? 'ندارد',
                'exit_time' => $row['exit_time'] ?? 'ندارد',
                'status_text' => $status_text,
                'status_class' => $status_class,
                'time' => date('H:i:s')
            ];
        }
    }

    header('Content-Type: application/json');
    echo json_encode($data);
}

$conn->close();
?>
