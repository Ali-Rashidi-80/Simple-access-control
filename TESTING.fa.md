<div dir="rtl">

# 🧪 راهنمای آزمون و اعتبارسنجی خودکار

**[English](TESTING.md)** • **[فارسی](TESTING.fa.md)**

این پروژه از ساختار آزمون لایه‌ای شامل تحلیل ایستا، آزمون‌های واحد، آزمون‌های یکپارچگی، شبیه‌سازی پروتکل‌های سخت‌افزار و آزمون‌های سرتاسری (<bdi>E2E</bdi>) استفاده می‌کند.

---

## ۱. نمای کلی ساختار لایه‌های آزمون

| لایه آزمون | ابزارها و فریمورک‌ها | محدوده و اهداف آزمون |
| :--- | :--- | :--- |
| **تحلیل ایستا (Static Analysis)** | <bdi>`ruff`, `black`, `isort`, `mypy`, `pylint`</bdi> | فرمت‌بندی استاندارد کد، تطابق با <bdi>PEP 8</bdi>، اعتبارسنجی تایپ‌ها و سلامت نحوی |
| **آزمون واحد بک‌اند** | <bdi>`pytest`, `pytest-asyncio`, `httpx`</bdi> | اعتبارسنجی روت‌های <bdi>REST</bdi>، مدیریت توکن‌ها، چرخه پیامک یکبارمصرف و مجوزها |
| **ایزولاسیون پایگاه داده** | <bdi>`SQLAlchemy 2.0`, `aiosqlite`, `NullPool`</bdi> | ایزولاسیون تراکنش‌ها، رول‌بک بعد از تست و عدم تداخل اتصالات همروند |
| **شبیه‌سازی سخت‌افزار** | <bdi>`starlette.testclient`, WebSocket</bdi> | شبیه‌سازی بسته‌های اسکن کارت <bdi>ESP32</bdi>، تپش‌های ضربان سلامت و زمان‌بندی رله |
| **کامپوننت‌های فرانت‌اند** | <bdi>`Vitest`, React Testing Library</bdi> | آزمون وضعیت کامپوننت‌ها، مرزهای خطا در رابط کاربری و اتصال مجدد سوکت |
| **آزمون سرتاسری (<bdi>E2E</bdi>)** | <bdi>`Playwright`</bdi> | سنجش چرخه کامل سیستم از لحظه کارت‌زدن مجازی تا درج آنی در جدول داشبورد |

---

## ۲. اجرای آزمون‌های بک‌اند با پایتست (<bdi>Pytest</bdi>)

مجموعه تست‌های بک‌اند شامل **۱۱۲ تست خودکار** پوشش‌دهنده کلیه ماژول‌ها است:

```bash
cd backend

# اجرای کلیه آزمون‌ها با گزارش تفصیلی در ترمینال
python -m pytest tests/ -v

# اجرای آزمون‌ها همراه با گزارش درصد پوشش کد (Coverage)
python -m pytest tests/ --cov=app --cov-report=term-missing

# اجرای یک فایل تست خاص
python -m pytest tests/test_websocket.py -v
python -m pytest tests/test_esp32_simulation.py -v
python -m pytest tests/test_security.py -v
```

---

## ۳. اجرای گیت‌های کیفیت استاتیک کد

اجرای پایپ‌لاین کنترل کیفی قطعی:

```bash
# ۱. اعتبارسنجی کامپایل بایت‌کد پایتون
python -m compileall backend

# ۲. اجرای لینتر فوق سریع Ruff
python -m ruff check backend

# ۳. انطباق کامل فرمت‌بندی با Black و Isort
python -m black backend --check
python -m isort backend --check-only

# ۴. بررسی تایپ‌های ایستا با Mypy
python -m mypy backend/app

# ۵. سنجش ساختاری کد با Pylint
python -m pylint backend/app --errors-only
```

---

## ۴. آزمون کامپوننت‌های فرانت‌اند (<bdi>Vitest</bdi>)

```bash
cd frontend

# اجرای آزمون‌های واحد فرانت‌اند
npm test

# اجرای آزمون‌ها در حالت تعاملی Watch
npm run test:ui
```

---

## ۵. اجرای آزمون‌های سرتاسری (<bdi>Playwright E2E</bdi>)

**پیش‌نیازها:**
۱. اجرای سرور بک‌اند روی پورت ۸۰۰۰ با پایگاه داده تست.
۲. اجرای سرور توسعه فرانت‌اند روی پورت ۵۱۷۳.

```bash
cd e2e

# نصب باینری‌های مرورگرهای Playwright (تنها بار اول)
npx playwright install --with-deps

# اجرای سناریوهای سرتاسری
npx playwright test
```

</div>
