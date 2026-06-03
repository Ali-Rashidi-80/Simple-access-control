<div align="center">

# 💎 Liquid Neon Persian Picker
### The Ultimate High-End Jalali Date Range Picker for React

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0%2B-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Motion-Powered-purple.svg?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)

<br />

<p align="center">
  <b>Liquid Neon</b> is not just a date picker; it's a <b>UI experience</b>.<br/>
  Built with a focus on <b>Glassmorphism</b>, <b>Cyberpunk Aesthetics</b>, and <b>Fluid Physics</b>.<br/>
  It provides a fully responsive Persian (Jalali) date range selection interface that feels alive.
</p>

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api-reference) • [Theming](#-styling--theming) • [فارسی](#-مستندات-فارسی)

</div>

---

## ✨ Features

### 🎨 Visual Engineering & Aesthetics
- **Cinema-Grade Glassmorphism**: Utilizes multi-layer backdrop blurs, noise textures, and specular reflections to create a realistic frosted glass effect.
- **Neon Glow System**: Interactive elements cast dynamic light that reacts to user interaction, creating a sense of depth and energy.
- **Fluid Physics Animations**: Powered by `framer-motion`, every transition (opening, hovering, selecting) uses spring physics for a natural, non-linear feel.

### 🧠 Intelligent UX
- **Smart Trigger**: A compact button that intelligently expands to show detailed date information only when needed.
- **Auto-Close Timer**: Detects inactivity and automatically closes the modal after 5 seconds to keep the interface clean.
- **Context-Aware Layouts**: Automatically switches between Desktop (Sidebar), Tablet (Grid), and Mobile (Bottom Sheet) views.
- **Smart Inputs**: Handles single-day selection logic (hides range if start == end) and formats dates intuitively.

### 📅 Core Functionality
- **Full Jalali Support**: Built on `date-fns-jalali` for precise Persian calendar calculations.
- **Range Selection**: Intuitive start and end date picking with visual highlighting of the range.
- **Quick Shortcuts**: Sidebar access to "Today", "Yesterday", "This Week", and "Last Month".
- **Month/Year Navigator**: A dedicated grid view for jumping between months and years quickly.

---

## 📦 Installation

Since this is a high-end UI component, it is designed to be integrated directly into your project source.

### Step 1: Dependencies
Install the required peer dependencies:

```bash
npm install date-fns-jalali framer-motion lucide-react clsx tailwind-merge
# or
yarn add date-fns-jalali framer-motion lucide-react clsx tailwind-merge
```

### Step 2: Add the Component
Copy the `NeonDatePicker` folder and the `styles/neon-datepicker.css` file into your project structure:

```
src/
├── components/
│   └── NeonDatePicker/   <-- The Component Folder
└── styles/
    └── neon-datepicker.css   <-- The Styles File
```

### Step 3: Import Styles
Import the CSS file in your root `index.tsx`, `App.tsx`, or `layout.tsx`:

```tsx
import './styles/neon-datepicker.css';
```

### Step 4: Font Setup (Recommended)
For the best visual experience, use the **Vazirmatn** font. Add it to your HTML or CSS:

```html
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
```

---

## 🚀 Usage

### Basic Example

```tsx
import React, { useState } from 'react';
import NeonDatePicker from './components/NeonDatePicker';
import { DateRange } from './components/NeonDatePicker/types';

const App = () => {
  const [range, setRange] = useState<DateRange>({ startDate: null, endDate: null });

  return (
    <div className="bg-slate-900 min-h-screen p-10" dir="rtl">
      <NeonDatePicker 
        onChange={setRange}
        onReset={() => setRange({ startDate: null, endDate: null })}
      />
    </div>
  );
};
```

### Advanced Configuration

```tsx
<NeonDatePicker 
  onChange={handleDateChange}
  defaultOpen={true}
  className="z-50 my-custom-class"
/>
```

---

## 📚 API Reference

### `NeonDatePicker` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onChange` | `(range: DateRange) => void` | `undefined` | **Required**. Callback fired when the user confirms the selection. |
| `onReset` | `() => void` | `undefined` | Callback fired when the "Clear" (پاک کردن) button is clicked. |
| `defaultOpen` | `boolean` | `false` | Sets the initial open state of the picker modal. |
| `className` | `string` | `""` | Additional CSS classes to apply to the trigger wrapper. |

### `DateRange` Type

```typescript
interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}
```

---

## 🎨 Styling & Theming

Liquid Neon uses **CSS Variables** and specific **Tailwind classes** defined in `neon-datepicker.css`. You can easily customize the look.

### Changing the Neon Color
To change the primary neon color (Default: Cyan `#00F0FF`), override the CSS classes or edit `neon-datepicker.css`:

```css
/* Example: Change to Purple Neon */
.text-neon { color: #d946ef !important; }
.bg-neon { background-color: #d946ef !important; }
.border-neon { border-color: #d946ef !important; }
.shadow-neon { box-shadow: 0 0 10px rgba(217, 70, 239, 0.5) !important; }
```

### Dark Mode Only
This component is designed specifically for **Dark Mode** interfaces. It relies on dark backgrounds (`slate-900`, `black`) to make the glass and neon effects pop.

---

<br />
<br />

<div dir="rtl" align="right">

# 💎 مستندات فارسی
### انتخابگر تاریخ نئون مایع (Liquid Neon)
#### پیشرفته‌ترین دیت‌پیکر جلالی (شمسی) برای ری‌اکت

<br />

**لیکوئید نئون (Liquid Neon)** فراتر از یک ابزار انتخاب تاریخ است؛ این یک **تجربه کاربری** است.
طراحی شده با الهام از سبک‌های **سایبرپانک** و **گلس‌مورفیسم**، این کامپوننت با استفاده از فیزیک سیال، رابط کاربری‌ای را ارائه می‌دهد که زنده و پویا به نظر می‌رسد.

[ویژگی‌ها](#-ویژگی‌ها) • [نصب](#-نصب-و-راه‌اندازی) • [استفاده](#-نحوه-استفاده) • [شخصی‌سازی](#-شخصی‌سازی)

---

## ✨ ویژگی‌ها

### 🎨 مهندسی بصری و زیبایی‌شناسی
- **گلس‌مورفیسم سینمایی**: استفاده از چندین لایه بلور (Blur)، بافت نویز (Noise Texture) و بازتاب‌های نور برای ایجاد حس واقعی شیشه مات.
- **سیستم نوری نئون**: المان‌های تعاملی دارای درخشش نئونی هستند که به حرکت ماوس و کلیک کاربر واکنش نشان می‌دهند.
- **انیمیشن‌های فیزیکال**: تمام حرکات (باز شدن، هاور، انتخاب) با استفاده از `framer-motion` و فیزیک فنری (Spring Physics) پیاده‌سازی شده‌اند تا حسی طبیعی داشته باشند.

### 🧠 تجربه کاربری هوشمند (Smart UX)
- **تریگر هوشمند**: دکمه باز کردن تقویم در حالت عادی کوچک است و تنها زمانی که نیاز باشد، اطلاعات کامل تاریخ را نمایش می‌دهد.
- **تایمر عدم فعالیت**: اگر کاربر ۵ ثانیه با تقویم تعامل نکند، مودال به صورت خودکار بسته می‌شود تا صفحه شلوغ نشود.
- **طراحی واکنش‌گرا (Responsive)**: تغییر خودکار چیدمان بین دسکتاپ (سایدبار)، تبلت (گرید) و موبایل (Bottom Sheet).

### 📅 عملکرد هسته
- **پشتیبانی کامل جلالی**: محاسبات دقیق تقویم شمسی با استفاده از `date-fns-jalali`.
- **انتخاب بازه زمانی**: انتخاب آسان تاریخ شروع و پایان با هایلایت بصری مسیر.
- **میانبرهای سریع**: دسترسی سریع به "امروز"، "دیروز"، "هفته جاری" و "ماه قبل".
- **ناوبری ماه/سال**: نمای اختصاصی برای پرش سریع بین ماه‌ها و سال‌ها.

---

## 📦 نصب و راه‌اندازی

از آنجایی که این یک کامپوننت UI سطح بالا (High-End) است، پیشنهاد می‌شود فایل‌های آن را مستقیماً در پروژه خود کپی کنید.

### مرحله ۱: نصب وابستگی‌ها

```bash
npm install date-fns-jalali framer-motion lucide-react clsx tailwind-merge
```

### مرحله ۲: افزودن کامپوننت
پوشه `NeonDatePicker` و فایل `styles/neon-datepicker.css` را در ساختار پروژه خود کپی کنید.

### مرحله ۳: ایمپورت استایل‌ها
فایل CSS را در فایل اصلی پروژه (`App.tsx` یا `index.tsx`) ایمپورت کنید:

```tsx
import './styles/neon-datepicker.css';
```

### مرحله ۴: تنظیم فونت (پیشنهادی)
برای بهترین نمایش متون فارسی، از فونت **وزیرمتن (Vazirmatn)** استفاده کنید.

---

## 🚀 نحوه استفاده

### مثال ساده

```tsx
import React, { useState } from 'react';
import NeonDatePicker from './components/NeonDatePicker';
import { DateRange } from './components/NeonDatePicker/types';

const App = () => {
  const [range, setRange] = useState<DateRange>({ startDate: null, endDate: null });

  return (
    <div className="bg-slate-900 min-h-screen p-10" dir="rtl">
      <NeonDatePicker 
        onChange={setRange}
        onReset={() => setRange({ startDate: null, endDate: null })}
      />
    </div>
  );
};
```

---

## 📚 راهنمای API

### پراپ‌های `NeonDatePicker`

| پراپ | نوع | پیش‌فرض | توضیحات |
| :--- | :--- | :--- | :--- |
| `onChange` | `(range: DateRange) => void` | `undefined` | **الزامی**. تابعی که پس از تایید انتخاب کاربر اجرا می‌شود. |
| `onReset` | `() => void` | `undefined` | زمانی که دکمه "پاک کردن" کلیک شود اجرا می‌شود. |
| `defaultOpen` | `boolean` | `false` | وضعیت اولیه باز بودن مودال تقویم. |
| `className` | `string` | `""` | کلاس‌های CSS اضافی برای دکمه تریگر. |

---

## 🎨 شخصی‌سازی

لیکوئید نئون از **CSS Variables** و کلاس‌های اختصاصی **Tailwind** که در فایل `neon-datepicker.css` تعریف شده‌اند استفاده می‌کند.

### تغییر رنگ نئون
برای تغییر رنگ اصلی (پیش‌فرض: فیروزه‌ای `#00F0FF`)، کافیست مقادیر رنگ را در فایل CSS تغییر دهید یا کلاس‌ها را Override کنید.

### حالت تاریک (Dark Mode)
این کامپوننت به طور اختصاصی برای رابط‌های کاربری **تاریک (Dark Mode)** طراحی شده است و روی پس‌زمینه‌های تیره (`slate-900` یا `black`) بهترین جلوه را دارد.

</div>

---

<div align="center">
  <br />
  <p>Made with ❤️ for the Persian React Community</p>
  <p>طراحی شده با عشق برای جامعه ری‌اکت ایران</p>
</div>
