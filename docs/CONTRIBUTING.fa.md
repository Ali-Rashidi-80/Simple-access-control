<div dir="rtl">

# 🤝 راهنمای مشارکت در توسعه

**[English](CONTRIBUTING.md)** • **[فارسی](CONTRIBUTING.fa.md)**

این مستند راهنمای راه‌اندازی محیط توسعه، اجرای آزمون‌ها و استانداردهای ارسال کد برای این پروژه است.

---

## ۱. پیش‌نیازها و ابزارهای مورد نیاز

برای راه‌اندازی و آزمون لوکال پروژه، از نصب ابزارهای زیر بر روی سیستم خود اطمینان حاصل نمایید:

- **پایتون:** نسخه <bdi>3.11</bdi> یا <bdi>3.12</bdi>
- **محیط Node.js:** نسخه <bdi>18.x</bdi> یا <bdi>20.x LTS</bdi> به همراه مدیر بسته <bdi>npm</bdi>
- **گیت:** ابزار خط فرمان استاندارد
- **داکر و داکر کامپوز:** (اختیاری، جهت تست کانتینری محیط تست)
- **ابزارهای میکروپایتون:** <bdi>`mpremote`</bdi> یا <bdi>`esptool.py`</bdi> (در صورت ویرایش فرمور سخت‌افزار)

---

## ۲. گردش کار توسعه در محیط لوکال

```bash
# ۱. فورک و کلون کردن مخزن پروژه
git clone https://github.com/<your-username>/Simple-access-control.git
cd Simple-access-control

# ۲. راه‌اندازی محیط مجازی ایزوله پایتون
python -m venv .venv
source .venv/bin/activate  # در ویندوز: .venv\Scripts\activate

# ۳. نصب پکیج‌های بک‌اند و ابزارهای کیفیت‌سنجی
pip install -r backend/requirements.txt
pip install ruff black isort mypy pylint pytest pytest-asyncio respx httpx Faker coverage

# ۴. کپی فایل نمونه متغیرهای محیطی
cp .env.example .env
```

---

## ۳. گیت‌های سنجش کیفیت و کنترل استاتیک

تمام پول‌ریکوئست‌ها باید پیش از ارسال، گیت‌های تست و کنترل کیفی زیر را با موفقیت سپری نمایند:

```bash
# ۱. اعتبارسنجی سینتکس و کامپایل بایت‌کد
python -m compileall backend

# ۲. اجرای لینتر سریع روف (Ruff)
python -m ruff check backend

# ۳. بررسی فرمت‌بندی کد با Black و Isort
python -m black backend --check
python -m isort backend --check-only

# ۴. تحلیل استاتیک تایپ‌ها با Mypy
python -m mypy backend/app

# ۵. سنجش یکپارچگی ساختاری کد با Pylint
python -m pylint backend/app --errors-only

# ۶. اجرای تست‌های خودکار با Pytest
python -m pytest backend/tests -v
```

---

## ۴. استانداردهای کامیت و شاخه‌بندی (<bdi>Conventional Commits</bdi>)

ما از الگوی استاندارد کامیت‌های معنادار پیروی می‌کنیم:

- <bdi>`feat: add dual-tone acoustic feedback for badge scan events`</bdi>
- <bdi>`fix: prevent race condition on WebSocket disconnection during database flush`</bdi>
- <bdi>`refactor: extract authentication verification into dedicated service class`</bdi>
- <bdi>`docs: update hardware wiring pinout for ESP32 GPIO 16`</bdi>
- <bdi>`test: add unit coverage for unknown RFID broadcast event`</bdi>

الگوی نام‌گذاری برنچ‌ها:
- <bdi>`feat/<feature-slug>`</bdi>
- <bdi>`fix/<bug-slug>`</bdi>
- <bdi>`refactor/<refactor-slug>`</bdi>

---

## ۵. سیاست حفظ اسرار و داده‌های حساس

- **هرگز** اطلاعات احراز هویت، کلیدهای <bdi>API</bdi>، دیتابیس‌های لوکال <bdi>.db</bdi> یا فایل‌های <bdi>.env</bdi> را کامیت نکنید.
- فایل <bdi>.gitignore</bdi> به گونه‌ای تنظیم شده که از ردگیری این فایل‌ها ممانعت کند. پیش از مرحله‌استیج، خروجی <bdi>`git status`</bdi> را به دقت بازبینی کنید.
- در صورت کشف هرگونه روزنه امنیتی، مراتب را مطابق با مستند [SECURITY.md](../SECURITY.md) به صورت خصوصی گزارش نمایید.

---

## ۶. چک‌لیست نهایی پیش از ایجاد <bdi>Pull Request</bdi>

پیش از باز کردن <bdi>PR</bdi> بررسی نمایید که:
۱. تمام تست‌های <bdi>`pytest backend/tests`</bdi> صد در صد پاس شده باشند.
۲. دستورات <bdi>`ruff check`</bdi>، <bdi>`black`</bdi>، <bdi>`isort`</bdi> و <bdi>`mypy`</bdi> هیچ خطایی تولید نکنند.
۳. در صورت تغییر در رفتار کاربر، مستندات مرتبط در دایرکتوری <bdi>`docs/`</bdi> به هر دو زبان انگلیسی و فارسی به‌روزرسانی شده باشند.

</div>
