<?php
// اتصال به پایگاه داده
$servername = "185.94.98.252";
$dbname = "ewyjapml_Attendance_System";
$username = "ewyjapml";
$password = "aezakmiAEZAKMI790";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

// بررسی اتصال
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// دریافت اطلاعات کاربران از جدول User_table
$sql = "SELECT Frist_Name, Last_Name FROM User_table";
$result = $conn->query($sql);

$users = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'name' => $row['Frist_Name'] . ' ' . $row['Last_Name']
        ];
    }
}

// بازگرداندن اطلاعات به فرمت JSON
header('Content-Type: application/json');
echo json_encode($users);

// بستن اتصال
$conn->close();
?>
