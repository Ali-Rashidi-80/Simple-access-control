<div align="center">

# 🛡️ SentryGate
### The Ultimate IoT Access Control System
### سیستم کنترل تردد سازمانی هوشمند و فوق‌سریع

![Project Status](https://img.shields.io/badge/Status-Stable-success?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Async-green?style=for-the-badge)
![ESP32](https://img.shields.io/badge/Hardware-ESP32%20%7C%20MicroPython-orange?style=for-the-badge)
![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-blueviolet?style=for-the-badge)

<br/>

[**فارسی (Persian)**](#-مستندات-فارسی) | [**English**](#-english-documentation)

<br/>

</div>

---

<div dir="rtl" align="right">

# 🇮🇷 مستندات فارسی

## 🌟 معرفی: فراتر از امنیت (Introduction)
پروژه **SentryGate** یک شاهکار مهندسی در زمینه **اینترنت اشیاء (IoT)** و کنترل تردد است. این سیستم با تلفیق قدرت خیره‌کننده **ESP32**، سرعت بی‌نظیر **FastAPI** و زیبایی چشم‌نواز **React**، استانداردهای جدیدی را در صنعت سیستم‌های امنیتی تعریف می‌کند. 

تصور کنید سیستمی که نه تنها امنیت شما را تضمین می‌کند، بلکه با رابط کاربری **"نئون مایع" (Liquid Neon)** و بازخورد **Real-time**، حس کار با تکنولوژی آینده را به شما می‌دهد.

> **SentryGate فقط یک قفل هوشمند نیست؛ یک تجربه کاربری مدرن است.**

---

## ✨ ویژگی‌های شگفت‌انگیز (Key Features)

### ⚡ سرعت نور (Real-time Performance)
*   **معماری WebSocket:** خداحافظی با Polling! تمام رویدادها (باز شدن درب، ثبت تردد، هشدارها) در کسری از ثانیه (<100ms) روی داشبورد ظاهر می‌شوند.
*   **داشبورد زنده:** مشاهده وضعیت کاربران، لاگ‌ها و دمای محیط به صورت آنی.

### 🎨 رابط کاربری خیره‌کننده (UI/UX)
*   **طراحی نئون و شیشه‌ای:** استفاده از استایل‌های **Glassmorphism** و طیف‌های نوری جذاب که محیط کاربری را زنده می‌کند.
*   **انیمیشن‌های Framer Motion:** تمام تعاملات (باز شدن مودال‌ها، هاور دکمه‌ها) با انیمیشن‌های روان و فیزیک واقع‌گرایانه همراه هستند.
*   **واکنش‌گرا (Responsive):** تجربه‌ای یکسان روی موبایل ادمین و دسکتاپ اتاق مانیتورینگ.

### 🤖 هوشمندی و پایداری (Intelligence & Resilience)
*   **ثبت‌نام زنده (Live Registration):** کارت جدید را جلوی دستگاه بگیرید -> روی نوتیفیکیشن داشبورد کلیک کنید -> کاربر ثبت شد! به همین سادگی.
*   **خود-اشکال‌زدایی (Self-Healing):** اگر وای‌فای قطع شود یا نویزی در محیط باشد، سیستم به طور خودکار ریکاوری کرده و به شبکه باز می‌گردد.
*   **پروتکل امن:** ارتباطات رمزنگاری شده و محافظت شده در برابر حملات متداول.

### 🎵 سمفونی صوتی (Audio Feedback)
*   تعبیه ملودی‌های اختصاصی PWM برای شرایط مختلف:
    *   ✅ **موفقیت:** ملودی "Magic Chime"
    *   ⛔ **خطا:** افکت صوتی "System Failure"
    *   🚨 **هشدار:** آژیر امنیتی

---

## 🛠 معماری قدرتمند (Tech Stack)

| لایه | تکنولوژی | چرا انتخاب کردیم؟ |
| :--- | :--- | :--- |
| **Frontend** | **React + Vite** | سریع‌ترین بیلد و مدرن‌ترین تجربه توسعه |
| **Styling** | **TailwindCSS** | طراحی سیستماتیک و فوق‌سریع |
| **Backend** | **FastAPI (Python)** | پادشاه پرفورمنس در پایتون با پشتیبانی ذاتی از Async |
| **Database** | **SQLite + aiosqlite** | سریع، بدون نیاز به کانفیگ پیچیده و ایده‌آل برای Edge Computing |
| **Hardware** | **ESP32 + MicroPython** | قدرت پردازش بالا و زبان سطح بالای پایتون برای سخت‌افزار |
| **DevOps** | **Docker + Nginx** | استقرار با یک کلیک و ایزولاسیون کامل |

---

## 🚀 شروع سفر (Quick Start)

تنها چیزی که نیاز دارید **Docker** است. ترمینال را باز کنید و جادو را آغاز کنید:

```bash
docker-compose up --build -d
```

سپس وارد دنیای SentryGate شوید:
*   🔗 **داشبورد مدیریت:** `http://localhost`
*   📄 **داکیومنت API:** `http://localhost/api/docs`

---

## 📚 مستندات تکمیلی

*   [🏗️ **معماری سیستم (Architecture):**](docs/ARCHITECTURE.md) بررسی عمیق دیتا فلو و دیاگرام‌ها.
*   [🛠️ **راهنمای سخت‌افزار (Hardware Guide):**](docs/HARDWARE_GUIDE.md) نقشه سیم‌کشی و لیست قطعات.
*   [🤝 **مشارکت (Contributing):**](docs/CONTRIBUTING.md) چگونه در توسعه این پروژه سهیم باشید.

---
</div>

<div align="center">
********************************************************************************
</div>

---

<div dir="ltr" align="left">

# 🇺🇸 English Documentation

## 🌟 Introduction: Beyond Security
**SentryGate** is an engineering masterpiece in the realm of **Industrial IoT** access control. Merging the raw power of **ESP32**, the blazing speed of **FastAPI**, and the aesthetic beauty of **React**, it redefines security system standards.

Imagine a system that not only secures your perimeter but provides a futuristic **"Liquid Neon"** user experience with **Real-time** feedback.

> **SentryGate is not just a smart lock; it's a modern user experience.**

---

## ✨ Amazing Features

### ⚡ Light Speed (Real-time Performance)
*   **WebSocket Architecture:** Goodbye Polling! All events (Door Open, Logs, Alerts) appear on the dashboard in a fraction of a second (<100ms).
*   **Live Dashboard:** Monitor user status, access logs, and ambient temperature instantly.

### 🎨 Stunning UI/UX
*   **Liquid Neon Design:** Utilizing **Glassmorphism** styles and vibrant color gradients to bring the interface to life.
*   **Framer Motion Animations:** All interactions (Modal openings, Button hovers) feature smooth, physics-based animations.
*   **Fully Responsive:** Seamless experience on both Admin Mobile and Monitoring Desktop.

### 🤖 Intelligence & Resilience
*   **Live Registration:** Tap a new card -> Click the dashboard notification -> User Registered! It's that simple.
*   **Self-Healing:** If Wi-Fi drops or environmental noise occurs, the system automatically recovers and reconnects.
*   **Secure Protocol:** Encrypted communication protected against common attacks.

### 🎵 Audio Symphony
*   Dedicated PWM melodies for distinct feedbacks:
    *   ✅ **Success:** "Magic Chime" melody.
    *   ⛔ **Error:** "System Failure" sound effect.
    *   🚨 **Alert:** Security siren.

---

## 🛠 Powerful Architecture

| Layer | Technology | Why? |
| :--- | :--- | :--- |
| **Frontend** | **React + Vite** | Fastest build & modern dev experience |
| **Styling** | **TailwindCSS** | Systematic & ultra-fast design |
| **Backend** | **FastAPI (Python)** | Performance king of Python with native Async support |
| **Database** | **SQLite + aiosqlite** | Fast, zero-config, ideal for Edge Computing |
| **Hardware** | **ESP32 + MicroPython** | High processing power with high-level Python syntax |
| **DevOps** | **Docker + Nginx** | One-click deployment & full isolation |

---

## 🚀 Quick Start

All you need is **Docker**. Open your terminal and start the magic:

```bash
docker-compose up --build -d
```

Then step into the world of SentryGate:
*   🔗 **Admin Dashboard:** `http://localhost`
*   📄 **API Docs:** `http://localhost/api/docs`

---

## 📚 Documentation Links (Persian for now)

*   [🏗️ **System Architecture**](docs/ARCHITECTURE.md)
*   [🛠️ **Hardware Guide**](docs/HARDWARE_GUIDE.md)
*   [🤝 **Contributing Guide**](docs/CONTRIBUTING.md)

---
</div>

<div align="center">
Made with ❤️, ☕, and Python by the <b>SentryGate Team</b>.
</div>