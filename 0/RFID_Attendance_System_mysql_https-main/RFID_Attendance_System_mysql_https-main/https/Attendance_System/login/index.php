<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="stylesheet" href="style.css">
    <title>Attendance System login</title>
    <style>
    
    
/* تنظیمات پایه */
body {
    margin: 0;
    padding: 0;
    height: 100vh;
    width: 100vw;
    background: none; /* حذف تصویر از اینجا */
    position: relative;
    overflow: hidden;
}

/* اعمال تصویر و افکت بلور */
body::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("2.jpg"); /* جایگزین کنید با مسیر تصویر خود */
    background-size: cover; /* تصویر کل صفحه را می‌پوشاند */
    background-position: bottom; /* موقعیت تصویر */
    background-repeat: no-repeat; /* جلوگیری از تکرار تصویر */
    filter: blur(5px); /* افکت بلور */
    z-index: -2; /* زیر تمام محتوای صفحه قرار می‌گیرد */
}

/* لایه نیمه شفاف */
body::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3); /* شفافیت */
    z-index: -1; /* بالای لایه بلور قرار می‌گیرد */
}

    
    
    
    /* استایل کلی برای فرم‌ها */
.form-holder {
    margin: 20px 0;
    padding: 10px;
}

/* استایل برای لیبل (label) */
label {
    display: block;
    font-size: 13px;
    font-weight: bold;
    margin-top: 8px;
    color: #333;
}

/* استایل برای المان انتخاب (select) */
select {
    width: 100%;
    padding: 5px;
    font-size: 13px;
    border: 2px solid #ccc;
    border-radius: 5px;
    background-color: #f9f9f9;
    color: #333;
    box-sizing: border-box;
    transition: border-color 0.3s ease, background-color 0.3s ease;
}

/* تغییر رنگ پس‌زمینه و حاشیه هنگام فوکوس (focus) */
select:focus {
    border-color: #4CAF50;
    background-color: #e9f7e9;
    outline: none;
}

/* استایل برای گزینه‌ها داخل select */
select option {
    padding: 10px;
    font-size: 14px;
}

/* استایل برای دکمه ارسال */
.submit-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 12px 20px;
    text-align: center;
    font-size: 16px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

/* تغییر رنگ دکمه ارسال هنگام هاور */
.submit-btn:hover {
    background-color: #45a049;
}



/* پیام‌های خطا */
.error-message {
    font-family: 'Arial', sans-serif; /* فونت ساده و خوانا */
    font-size: 16px; /* اندازه مناسب فونت */
    color: #fff; /* رنگ متن سفید */
    background-color: #ed6565d6; /* پس‌زمینه قرمز جذاب */
    border: 1px solid #C037FE; /* حاشیه تیره‌تر برای برجستگی */
    padding: 10px 15px; /* فاصله داخلی برای زیبایی */
    border-radius: 8px; /* گوشه‌های گرد */
    text-align: center; /* متن در مرکز */
    width: 80%; /* عرض پیام */
    max-width: 400px; /* حداکثر عرض */
    margin: 15px auto; /* فاصله از بالا و مرکز کردن */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* سایه زیبا برای عمق */
    animation: fadeIn 0.5s ease-out; /* افکت ورود */
}

/* انیمیشن ورود */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px); /* حرکت از بالا */
    }
    to {
        opacity: 1;
        transform: translateY(0); /* رسیدن به مکان اصلی */
    }
}


</style>
</head>
<body>
    <div class="form-structor">
        <div class="signup">
            <h2 class="form-title" id="signup"><span>or</span>ورود کارمندان</h2>
            <div class="form-holder">
                <form action="user_login.php" method="POST">
                    <input type="text" name="username" class="input" placeholder="Name" required />
                    <input type="email" name="email" class="input" placeholder="Email" required />
                    <input type="password" name="password" class="input" placeholder="Password" required />
                    <button type="submit" class="submit-btn">ورود</button>
                </form>
            </div>
        </div>
        <div class="login slide-up">
            <div class="center">
                <h2 class="form-title" id="login"><span>or</span>ورود مدیران</h2>
                <?php if (isset($_GET['error'])): ?>
                    <p class="error-message"><?php echo htmlspecialchars($_GET['error']); ?></p>
                <?php endif; ?>
                <?php if (isset($_GET['success'])): ?>
                    <p class="success-message"><?php echo htmlspecialchars($_GET['success']); ?></p>
                <?php endif; ?>
                <div class="form-holder">
                    <form action="manager_login.php" method="POST">
                        <input type="text" name="name" class="input" placeholder="Name" required />
                        <input type="email" name="email" class="input" placeholder="Email" required />
                        <input type="password" name="password" class="input" placeholder="Password" required />
                        
                        <!-- Select Role -->
                        <label for="role">انتخاب سطح دسترسی:</label>
                        <select name="role" id="role" required>
                            <option value="manager">مدیر</option>
                            <option value="senior_manager">مدیر ارشد</option>
                        </select>

                        <button type="submit" class="submit-btn">ورود</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
