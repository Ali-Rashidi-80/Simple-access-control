"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Language, TranslationKey } from "@/lib/types";

const LANGUAGE_STORAGE_KEY = "sg_language";
const PREFS_CHANNEL = "sg_prefs";

const fa: Record<TranslationKey, string> = {
  appName: "SentryGate",
  doorControl: "کنترل دسترسی درب",
  login: "ورود",
  logout: "خروج",
  username: "نام کاربری",
  password: "رمز عبور",
  showPassword: "نمایش رمز عبور",
  hidePassword: "مخفی کردن رمز عبور",
  passwordLoginTab: "رمز عبور",
  otpLoginTab: "کد پیامکی",
  phone: "شماره موبایل",
  phonePlaceholder: "09123456789",
  sendOtp: "ارسال کد تأیید",
  resendOtp: "ارسال مجدد کد",
  otpCode: "کد تأیید ۶ رقمی",
  verifyOtp: "تأیید و ورود",
  otpSentTo: "کد تأیید ارسال شد به",
  otpExpiresIn: "اعتبار کد:",
  secondsShort: "ثانیه",
  changePhone: "تغییر شماره",
  loginDescription: "برای مدیریت کنترل در وارد شوید",
  cookieAuthHint: "نشست با کوکی امن sg_access مدیریت می‌شود.",
  dashboard: "داشبورد",
  users: "کاربران",
  logs: "گزارش‌ها",
  settings: "تنظیمات",
  profile: "پروفایل",
  operators: "اپراتورها",
  temporaryPins: "پین‌های موقت",
  save: "ذخیره",
  cancel: "انصراف",
  confirm: "تأیید",
  close: "بستن",
  delete: "حذف",
  edit: "ویرایش",
  reset: "بازنشانی",
  search: "جستجو",
  filter: "فیلتر",
  loading: "در حال بارگذاری...",
  noResults: "نتیجه‌ای یافت نشد",
  error: "خطا",
  success: "موفق",
  retry: "تلاش مجدد",
  unexpectedError: "خطای غیرمنتظره‌ای رخ داد",
  unexpectedErrorDesc: "لطفاً صفحه را بازآوری یا دوباره تلاش کنید.",
  backendUnavailable: "سرویس در دسترس نیست یا خطایی در ارتباط رخ داد.",
  dismiss: "بستن",
  copy: "کپی",
  copied: "کپی شد",
  menu: "منو",
  quickTheme: "تغییر تم",
  connected: "متصل",
  offline: "آفلاین",
  websocketStatus: "وب‌سوکت",
  hardwareStatus: "سخت‌افزار",
  hardwareOnline: "دستگاه آنلاین",
  hardwareOffline: "دستگاه آفلاین",
  temperature: "دما",
  ping: "تأخیر API",
  accessLogs: "گزارش دسترسی",
  recentActivity: "آخرین رویدادها",
  pressAndHold: "باز کردن در",
  remoteOpenPrompt: "برای ارسال فرمان باز کردن درب کلیک کنید",
  unlockCommandSent: "دستور باز کردن ارسال شد",
  unlockCooldown: "لطفاً ۲ ثانیه صبر کنید",
  unlockDisconnected: "اتصال وب‌سوکت برقرار نیست",
  unknown: "ناشناس",
  unknownRfidDetected: "تگ RFID ناشناس شناسایی شد",
  registerTag: "ثبت کاربر با این تگ",
  accessGranted: "دسترسی داده شد",
  accessDenied: "دسترسی رد شد",
  duressAlert: "اضطرار",
  authorizedUsers: "کاربران مجاز",
  addUser: "افزودن کاربر",
  editUser: "ویرایش کاربر",
  deleteUserConfirm: "آیا از حذف این کاربر مطمئن هستید؟",
  userCreated: "کاربر با موفقیت ایجاد شد",
  userUpdated: "اطلاعات کاربر به‌روزرسانی شد",
  userDeleted: "کاربر حذف شد",
  fullName: "نام و نام خانوادگی",
  role: "نقش",
  standardUser: "کاربر عادی",
  operator: "اپراتور",
  guest: "مهمان",
  systemAdmin: "مدیر سیستم",
  rfidTag: "تگ RFID",
  pin: "پین",
  pinOptional: "PIN (اختیاری، ۴ تا ۸ رقم)",
  pinValidationError: "پین باید فقط شامل ۴ تا ۸ رقم باشد.",
  setPin: "تنظیم PIN",
  clearPin: "حذف PIN",
  pinSaved: "پین کاربر ذخیره شد",
  pinCleared: "پین کاربر حذف شد",
  pinConfigured: "پین دارد",
  noPin: "بدون پین",
  managePin: "مدیریت پین",
  expiresAt: "تاریخ انقضا",
  noExpiry: "بدون انقضا",
  status: "وضعیت",
  active: "فعال",
  inactive: "غیرفعال",
  all: "همه",
  searchUsersPlaceholder: "جستجو بر اساس نام یا RFID...",
  totalLogs: "کل رویدادها",
  grantedCount: "موفق",
  deniedCount: "رد شده",
  pendingCount: "در انتظار",
  searchLogsPlaceholder: "جستجوی نام یا RFID...",
  startsAt: "از تاریخ",
  endsAt: "تا تاریخ",
  exportCsv: "خروجی CSV",
  exportSuccess: "فایل CSV دانلود شد",
  timestamp: "زمان",
  previousPage: "قبلی",
  nextPage: "بعدی",
  pageOf: "صفحه",
  createOperator: "ایجاد اپراتور",
  editOperator: "ویرایش اپراتور",
  deactivateOperator: "غیرفعال‌سازی اپراتور",
  deactivateOperatorConfirm: "آیا از غیرفعال‌سازی این اپراتور مطمئن هستید؟",
  operatorCreated: "اپراتور جدید ایجاد شد",
  operatorUpdated: "اطلاعات اپراتور به‌روزرسانی شد",
  operatorDeactivated: "اپراتور غیرفعال شد",
  cannotDeactivateSelf: "نمی‌توانید حساب خودتان را غیرفعال کنید",
  adminOnlyNotice: "این صفحه فقط برای مدیر سیستم (admin) در دسترس است.",
  passwordResetOptional: "رمز عبور جدید (اختیاری)",
  email: "ایمیل",
  clearanceLevel: "سطح دسترسی",
  createTempPin: "ایجاد PIN موقت",
  pinCreatedOnce: "PIN موقت — فقط یک‌بار نمایش داده می‌شود",
  label: "عنوان",
  ttlHours: "مدت اعتبار (ساعت)",
  maxUses: "حداکثر استفاده",
  phoneOptional: "موبایل (اختیاری)",
  sendSms: "ارسال پیامک",
  smsSentBadge: "پیامک ارسال شد",
  smsNotSentBadge: "بدون پیامک",
  usesRemaining: "استفاده باقی‌مانده",
  expired: "منقضی / مصرف‌شده",
  revokePin: "لغو پین موقت",
  revokePinConfirm: "آیا از لغو این پین موقت مطمئن هستید؟",
  pinRevoked: "پین موقت لغو شد",
  systemSettings: "تنظیمات سیستم",
  autoLockTimeout: "قفل خودکار شبانه",
  tehranTimezoneNote: "ساعات قفل خودکار بر اساس منطقه زمانی تهران (Asia/Tehran) محاسبه می‌شوند.",
  startTime: "ساعت شروع",
  endTime: "ساعت پایان",
  requirePinWithRfid: "RFID + PIN",
  requirePinWithRfidDesc: "پس از اسکن RFID، کاربر باید ظرف ۱۰ ثانیه PIN وارد کند.",
  theme: "تم",
  neon: "نئون",
  matrix: "ماتریکس",
  light: "روشن",
  language: "زبان",
  unlockTimer: "زمان باز بودن درب (ثانیه)",
  duressSettings: "تنظیمات اضطرار",
  duressMode: "حالت اضطرار",
  duressModeDesc: "فعال‌سازی مسیرهای duress برای RFID و PIN.",
  duressRfid: "RFID اضطرار",
  duressRfidPlaceholder: "اختیاری — خالی = غیرفعال",
  duressPin: "PIN اضطرار",
  duressPinPlaceholder: "۴ تا ۸ رقم",
  duressPinConfigured: "PIN ذخیره شده — برای تغییر مقدار جدید وارد کنید",
  duressPinHint: "PIN به‌صورت HMAC روی سرور ذخیره می‌شود و دوباره نمایش داده نمی‌شود.",
  clearDuressPin: "حذف PIN اضطرار ذخیره‌شده",
  alertPhone: "شماره هشدار اضطرار (SMS)",
  alertPhonePlaceholder: "09123456789",
  readOnlySettingsNotice: "شما با نقش اپراتور وارد شده‌اید؛ تنظیمات فقط برای مدیر سیستم قابل ویرایش است.",
  saveChanges: "ذخیره تغییرات",
  settingsSaved: "تنظیمات ذخیره شد",
  uploadAvatar: "تغییر تصویر پروفایل",
  avatarRequirements: "فرمت‌های مجاز: JPG, PNG, GIF, WEBP (حداکثر ۵ مگابایت)",
  avatarTooLarge: "حجم فایل نباید بیشتر از ۵ مگابایت باشد.",
  avatarInvalidType: "فقط فایل‌های تصویری (JPEG, PNG, GIF, WEBP) مجاز هستند.",
  avatarUpdated: "تصویر پروفایل به‌روزرسانی شد",
  profileUpdated: "پروفایل با موفقیت به‌روزرسانی شد",
  currentPassword: "رمز عبور فعلی",
  newPassword: "رمز عبور جدید",
  confirmPassword: "تأیید رمز عبور",
  passwordsDoNotMatch: "رمز عبور جدید و تأیید آن مطابقت ندارند.",
  passwordTooShort: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد.",
  currentPasswordRequired: "برای تغییر رمز عبور، رمز عبور فعلی الزامی است."
};

const en: Record<TranslationKey, string> = {
  appName: "SentryGate",
  doorControl: "Door access control",
  login: "Login",
  logout: "Logout",
  username: "Username",
  password: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  passwordLoginTab: "Password",
  otpLoginTab: "SMS OTP",
  phone: "Mobile Phone",
  phonePlaceholder: "09123456789",
  sendOtp: "Send OTP",
  resendOtp: "Resend OTP",
  otpCode: "6-digit OTP code",
  verifyOtp: "Verify & Sign In",
  otpSentTo: "Verification code sent to",
  otpExpiresIn: "Code expires in:",
  secondsShort: "s",
  changePhone: "Change number",
  loginDescription: "Sign in to manage door control",
  cookieAuthHint: "The session is managed with the secure sg_access cookie.",
  dashboard: "Dashboard",
  users: "Users",
  logs: "Logs",
  settings: "Settings",
  profile: "Profile",
  operators: "Operators",
  temporaryPins: "Temporary PINs",
  save: "Save",
  cancel: "Cancel",
  confirm: "Confirm",
  close: "Close",
  delete: "Delete",
  edit: "Edit",
  reset: "Reset",
  search: "Search",
  filter: "Filter",
  loading: "Loading...",
  noResults: "No results found",
  error: "Error",
  success: "Success",
  retry: "Retry",
  unexpectedError: "An unexpected error occurred",
  unexpectedErrorDesc: "Please retry or reload the page.",
  backendUnavailable: "Service is unavailable or a network error occurred.",
  dismiss: "Dismiss",
  copy: "Copy",
  copied: "Copied",
  menu: "Menu",
  quickTheme: "Switch theme",
  connected: "Connected",
  offline: "Offline",
  websocketStatus: "WebSocket",
  hardwareStatus: "Hardware",
  hardwareOnline: "Device online",
  hardwareOffline: "Device offline",
  temperature: "Temperature",
  ping: "API Latency",
  accessLogs: "Access Logs",
  recentActivity: "Recent Activity",
  pressAndHold: "Open Door",
  remoteOpenPrompt: "Click to send remote unlock command",
  unlockCommandSent: "Unlock command sent",
  unlockCooldown: "Please wait 2s cooldown",
  unlockDisconnected: "WebSocket disconnected",
  unknown: "Unknown",
  unknownRfidDetected: "Unknown RFID tag detected",
  registerTag: "Register user",
  accessGranted: "Access granted",
  accessDenied: "Access denied",
  duressAlert: "Duress",
  authorizedUsers: "Authorized Users",
  addUser: "Add User",
  editUser: "Edit User",
  deleteUserConfirm: "Are you sure you want to delete this user?",
  userCreated: "User created successfully",
  userUpdated: "User updated successfully",
  userDeleted: "User deleted",
  fullName: "Full Name",
  role: "Role",
  standardUser: "Standard User",
  operator: "Operator",
  guest: "Guest",
  systemAdmin: "System Admin",
  rfidTag: "RFID Tag",
  pin: "PIN",
  pinOptional: "PIN (optional, 4–8 digits)",
  pinValidationError: "PIN must be 4 to 8 digits.",
  setPin: "Set PIN",
  clearPin: "Clear PIN",
  pinSaved: "User PIN saved",
  pinCleared: "User PIN cleared",
  pinConfigured: "PIN set",
  noPin: "No PIN",
  managePin: "Manage PIN",
  expiresAt: "Expires At",
  noExpiry: "No expiry",
  status: "Status",
  active: "Active",
  inactive: "Inactive",
  all: "All",
  searchUsersPlaceholder: "Search by name or RFID...",
  totalLogs: "Total Events",
  grantedCount: "Granted",
  deniedCount: "Denied",
  pendingCount: "Pending",
  searchLogsPlaceholder: "Search name or RFID...",
  startsAt: "From",
  endsAt: "To",
  exportCsv: "Export CSV",
  exportSuccess: "CSV exported",
  timestamp: "Timestamp",
  previousPage: "Previous",
  nextPage: "Next",
  pageOf: "Page",
  createOperator: "Create Operator",
  editOperator: "Edit Operator",
  deactivateOperator: "Deactivate Operator",
  deactivateOperatorConfirm: "Are you sure you want to deactivate this operator?",
  operatorCreated: "Operator created",
  operatorUpdated: "Operator updated",
  operatorDeactivated: "Operator deactivated",
  cannotDeactivateSelf: "You cannot deactivate your own account",
  adminOnlyNotice: "This section is restricted to system administrators.",
  passwordResetOptional: "New password (optional reset)",
  email: "Email",
  clearanceLevel: "Clearance Level",
  createTempPin: "Create Temporary PIN",
  pinCreatedOnce: "Temporary PIN — shown only once",
  label: "Label",
  ttlHours: "TTL (hours)",
  maxUses: "Max uses",
  phoneOptional: "Phone (optional)",
  sendSms: "Send SMS",
  smsSentBadge: "SMS sent",
  smsNotSentBadge: "No SMS",
  usesRemaining: "Uses remaining",
  expired: "Expired / Used",
  revokePin: "Revoke Temporary PIN",
  revokePinConfirm: "Are you sure you want to revoke this temporary PIN?",
  pinRevoked: "Temporary PIN revoked",
  systemSettings: "System Settings",
  autoLockTimeout: "Auto-Lock Schedule",
  tehranTimezoneNote: "Schedule is evaluated in Asia/Tehran timezone.",
  startTime: "Start Time",
  endTime: "End Time",
  requirePinWithRfid: "RFID + PIN",
  requirePinWithRfidDesc: "After RFID scan, the user must enter a PIN within 10 seconds.",
  theme: "Theme",
  neon: "Neon",
  matrix: "Matrix",
  light: "Light",
  language: "Language",
  unlockTimer: "Door unlock timer (seconds)",
  duressSettings: "Duress Settings",
  duressMode: "Duress mode",
  duressModeDesc: "Enable duress paths for RFID and PIN.",
  duressRfid: "Duress RFID",
  duressRfidPlaceholder: "Optional — empty disables",
  duressPin: "Duress PIN",
  duressPinPlaceholder: "4 to 8 digits",
  duressPinConfigured: "PIN stored — enter a new value to change",
  duressPinHint: "PIN is stored as an HMAC hash on the server and never shown again.",
  clearDuressPin: "Clear stored Duress PIN",
  alertPhone: "Emergency Alert Phone (SMS)",
  alertPhonePlaceholder: "09123456789",
  readOnlySettingsNotice: "Signed in as operator; only administrators can save system settings.",
  saveChanges: "Save Changes",
  settingsSaved: "Settings saved successfully",
  uploadAvatar: "Change avatar",
  avatarRequirements: "Allowed: JPG, PNG, GIF, WEBP (max 5 MB)",
  avatarTooLarge: "Image size must not exceed 5 MB.",
  avatarInvalidType: "Only image files (JPEG, PNG, GIF, WEBP) are allowed.",
  avatarUpdated: "Avatar updated",
  profileUpdated: "Profile updated",
  currentPassword: "Current Password",
  newPassword: "New Password",
  confirmPassword: "Confirm Password",
  passwordsDoNotMatch: "New password and confirmation do not match.",
  passwordTooShort: "New password must be at least 6 characters.",
  currentPasswordRequired: "Current password is required to set a new password."
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { fa, en };

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fa");
  const isRTL = language === "fa";

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "fa" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", isRTL);
    document.body.classList.toggle("ltr", !isRTL);
  }, [isRTL, language]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(PREFS_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string; language?: unknown }>) => {
      if (event.data?.type === "language" && (event.data.language === "fa" || event.data.language === "en")) {
        setLanguageState(event.data.language);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PREFS_CHANNEL);
      channel.postMessage({ type: "language", language: nextLanguage });
      channel.close();
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[language][key] ?? key,
    [language]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      isRTL
    }),
    [isRTL, language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
