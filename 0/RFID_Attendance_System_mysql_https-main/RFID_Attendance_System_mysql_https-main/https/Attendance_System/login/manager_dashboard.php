<?php
// شامل فایل بررسی نشست
include 'session_check.php'; 

// دریافت اطلاعات کاربر از پایگاه داده
$user_id = $_SESSION['user_id'];


// اتصال به پایگاه داده
include 'config.php'; 



// فرض کنید که اگر کاربر مدیر است، از جدول SystemManagers استفاده کنیم
$query = "SELECT * FROM SystemManagers WHERE manager_id = ?"; // تغییر نام جدول
$stmt = $conn->prepare($query);
if ($stmt) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
    } else {
        // در صورتی که کاربر در پایگاه داده یافت نشد
        header("Location: index.php?error=User not found.");
        exit();
    }
    $stmt->close();
} else {
    // اگر آماده‌سازی کوئری شکست خورد
    header("Location: index.php?error=Failed to prepare statement.");
    exit();
}

// بررسی و اعمال تنظیمات کاربر (Dark Mode)
$dark_mode = isset($_COOKIE['dark_mode']) && $_COOKIE['dark_mode'] === 'true' ? true : false;
?>





<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>داشبورد مدیر</title>
    <link rel="icon" type="image/png" href="/favicon.png">

    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    
    <link rel="stylesheet" href="dashboard.css">
    
    <style>
        /* General styling for the body */
        body {
            font-family: 'Vazir', sans-serif;
            background-color: #f4f7fc;
            color: #333;
            margin: 0;
            padding: 0;
        }

        /* Sidebar styling */
        .sidebar {
            width: 250px;
            height: 100vh;
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            position: fixed;
            transition: all 0.3s ease-in-out;
        }

        .sidebar .logo img {
            width: 100%;
            max-width: 150px;
            margin-bottom: 20px;
        }

        .sidebar h2 {
            font-size: 22px;
            margin-bottom: 300px;
            font-weight: bold;
            color: #f1f1f1;
        }

        .sidebar nav ul {
            list-style-type: none;
            padding: 0;
        }

        .sidebar nav ul li {
            margin: 15px 0;
            display: flex;
            align-items: center;
            font-size: 16px;
        }

        .sidebar nav ul li a {
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            padding: 10px 15px;
            width: 100%;
            border-radius: 5px;
        }

        .sidebar nav ul li a:hover {
            background-color: #34495e;
        }

        .sidebar nav ul li i {
            margin-right: 10px;
            font-size: 18px;
        }

        .settings label {
            color: white;
            font-size: 16px;
            display: flex;
            align-items: center;
        }

        .settings input {
            margin-left: 10px;
        }

        /* Main content styling */
        .main-content {
            margin-left: 260px;
            padding: 20px;
        }

        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .top-header .search-bar input {
            padding: 0px;
            font-size: 16px;
            width: 220px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }

        .top-header .profile a {
            color: #2980b9;
            font-size: 16px;
            text-decoration: none;
        }

        .button-group a, .button {
            display: inline-block;
            background-color: #2980b9;
            color: white;
            padding: 10px 15px;
            margin: 5px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }

        .button-group a:hover, .button:hover {
            background-color: #3498db;
        }

        h2 {
            color: #2c3e50;
        }

        .section {
            margin-bottom: 30px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .sidebar {
                width: 200px;
            }

            .main-content {
                margin-left: 220px;
            }

            .top-header .search-bar input {
                width: 200px;
            }
        }
    </style>
</head>
<body>
<div class="dashboard-container">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
        <h2 class="sidebar-title">داشبورد</h2>

        <nav>
            <ul>
                <!-- Profile Section with Icon -->
                <li class="sidebar-item"><a href="#" class="sidebar-link"><i class="fa fa-user"></i> پروفایل</a></li>
                
                <!-- Settings Section -->
                <li class="sidebar-item">
                    <div class="settings">
                        <h3 class="settings-title"><i class="fa fa-cogs"></i> تنظیمات</h3>
                        <ul class="settings-options">
                            <!-- Dark Mode Toggle -->
                            <li class="dark-mode-toggle">
                                <label>
                                    <input type="checkbox" id="dark-mode-toggle">
                                    <span class="toggle-label">Dark Mode</span>
                                </label>
                            </li>
                        </ul>
                    </div>
                </li>

                <!-- Logout Button with Icon -->
                <li class="sidebar-item">
                    <a href="logout.php" class="sidebar-link"><i class="fa fa-sign-out-alt"></i> خروج</a>
                </li>
            </ul>
        </nav>
    </aside>
<style>
/* Sidebar Container */
.sidebar {
    width: 250px;
    background-color: #2c3e50;
    padding: 20px;
    color: #fff;
    font-family: 'Arial', sans-serif;
}

/* Sidebar Title */
.sidebar-title {
    font-size: 1.5em;
    margin-bottom: 20px;
}

/* Sidebar List Items */
.sidebar-item {
    
    list-style: none;
    margin-bottom: 20px;
}

/* Sidebar Links */
.sidebar-link {
    color: #fff;
    text-decoration: none;
    font-size: 1.1em;
    display: flex;
    align-items: center;
    transition: background-color 0.3s ease;
}

/* Sidebar Link Hover Effect */
.sidebar-link:hover {
    background-color: #34495e;
    padding-left: 10px;
    border-radius: 5px;
}

/* Settings Section */
.settings-title {
    font-size: 1.2em;
    margin-bottom: 10px;
}

/* Dark Mode Toggle */
.dark-mode-toggle {
    margin-left: 10px;
}

.toggle-label {
    font-size: 1em;
    margin-left: 5px;
}

/* Logout Button */
.sidebar-item:last-child .sidebar-link {
    background-color: #e74c3c;
    padding: 10px;
    border-radius: 5px;
}

/* Sidebar Item Spacing */
ul {
    padding: 0;
    margin: 0;
}
</style>





<!-- Main Content -->
<main class="main-content">
    <header>
        <h1>مدیریت سازمان عزیز: <?php echo htmlspecialchars($user['full_name']); ?></h1>
        <img src="/profile-pic.jpg" alt="Profile Picture">
        <p>خوش آمدید، این داشبورد شماست</p>

        <br>
        <h1>داشبورد مدیر</h1>
    </header>





            <!-- Dashboard Sections -->
            <section class="section">
                <h2>گزارش‌ها</h2>
                <div class="button-group">
                    <a href="../manager/EmployeeAttendanceReports/index.php" class="button">گزارش حضور و غیاب امروز</a>
                    
                    <a href="../manager/گزارش حضور و غیاب هفتگی و ماهانه و سالانه/index.php" class="button">گزارش حضور و غیاب هفتگی و ماهانه و سالانه</a>
                    
                    <a href="../manager/گزارش ها/index.php" class="button">گزارش تأخیرات و گزارش مرخصی‌ها
 و گزارش اضافه کاری‌ها</a>
 
                    <a href="../manager/محاسبه ساعت کاری و اضافه کاری و حقوق براساس ساعات کار/index.php" class="button">محاسبه ساعت کاری و اضافه کاری و حقوق براساس ساعات کار</a>


 
                </div>
            </section>


            <section class="section">
                <h2>مدیریت</h2>
                <a href="../manager/مدیریت درخواست ها/مدیریت درخواست های مرخصی/index.php" class="button">مدیریت درخواست های مرخصی</a>
                
                
                <a href="../manager/مدیریت درخواست ها/مدیریت درخواست‌های اضافه‌کاری/index.php" class="button">مدیریت درخواست های اضافه‌کاری</a>
                
                
                <a href="../manager/فرم مدیریت کاربران/index.php" class="button">فرم مدیریت کاربران</a>


            </section>





    <script src="script-dashboard.js"></script>
</body>
</html>
