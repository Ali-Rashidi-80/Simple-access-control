# 🤝 راهنمای مشارکت (Contributing Guide)

ما از هرگونه مشارکت شما در توسعه SentryGate استقبال می‌کنیم! این مستند به شما کمک می‌کند تا محیط توسعه خود را راه‌اندازی کنید و کدهای خود را با استانداردهای پروژه هماهنگ کنید.

---

## 🛠️ راه‌اندازی محیط توسعه (Development Setup)

اگر می‌خواهید روی کدها کار کنید، بهتر است سرویس‌ها را به صورت لوکال (بدون داکر) اجرا کنید تا سرعت توسعه بالاتر برود.

### پیش‌نیازها
*   Python 3.10+
*   Node.js 18+
*   ESP32 Toolchain (Esptool)

### ۱. راه‌اندازی سرور (Backend)

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
سرور در آدرس `http://localhost:8000` در دسترس خواهد بود.

### ۲. راه‌اندازی کلاینت (Frontend)

```bash
cd ../  # (Root directory)
npm install
npm run dev
```
فرانت‌‌اند در آدرس `http://localhost:5173` اجرا می‌شود.

> **نکته:** در محیط توسعه، فرانت‌‌اند به صورت پیش‌فرض تلاش می‌کند به `ws://localhost:8000` متصل شود.

---

## 📝 استانداردهای کدنویسی (Code Style)

برای حفظ کیفیت و خوانایی کد، لطفاً قوانین زیر را رعایت کنید:

### پایتون (Backend & Firmware)
*   پیروی از استاندارد **PEP 8**.
*   استفاده از `Snake Case` برای نام‌گذاری متغیرها و توابع (مثال: `get_user_data`).
*   استفاده از `Type Hints` در توابع FastAPI الزامی است.

### جاوا اسکریپت / تایپ‌اسکریپت (Frontend)
*   پیروی از قواعد **ESLint** موجود در پروژه.
*   استفاده از `PascalCase` برای نام کامپوننت‌ها (مثال: `UserCard.tsx`).
*   استفاده از `camelCase` برای متغیرها و هوک‌ها.

---

## 🔄 فرآیند ارسال تغییرات (Pull Request Process)

1.  از ریپازیتوری یک **Fork** بگیرید.
2.  یک برنچ جدید برای ویژگی خود بسازید (`git checkout -b feature/NewCoolFeature`).
3.  تغییرات را کامیت کنید (`git commit -m "Add some AmazingFeature"`).
4.  برنچ را Push کنید (`git push origin feature/NewCoolFeature`).
5.  یک **Pull Request** باز کنید و تغییرات خود را توضیح دهید.

---

<div align="center">
با تشکر از اینکه به بهتر شدن SentryGate کمک می‌کنید! 🙏
</div>
