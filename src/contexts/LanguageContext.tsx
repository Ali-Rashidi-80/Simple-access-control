import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'fa' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  fa: {
    // Header
    appName: 'دروازه نگهبان',
    serverRoom: 'اتاق سرور آلفا-۷',
    connected: 'متصل',
    offline: 'آفلاین',

    // Navigation
    dashboard: 'داشبورد',
    accessLogs: 'گزارش دسترسی',
    users: 'کاربران',
    settings: 'تنظیمات',
    home: 'خانه',
    logs: 'گزارش‌ها',

    // Unlock Button
    pressAndHold: 'نگه دارید تا باز شود',
    holdToUnlock: 'نگه‌داری برای باز کردن قفل...',
    unlocking: 'در حال باز کردن...',
    unlocked: 'باز شد',
    lockingIn: 'قفل در',
    seconds: 'ثانیه',

    // Stats
    temperature: 'دما',
    humidity: 'رطوبت',
    ping: 'پینگ',

    // Status
    good: 'عالی',
    warning: 'هشدار',
    normal: 'عادی',
    success: 'موفق',
    error: 'خطا',
    pending: 'در انتظار',

    // Logs
    accessGranted: 'دسترسی داده شد',
    accessDenied: 'دسترسی رد شد',
    unknown: 'ناشناس',

    // Users
    authorizedUsers: 'کاربران مجاز',
    levelClearance: 'سطح دسترسی',

    // Settings
    systemSettings: 'تنظیمات سیستم',
    autoLockTimeout: 'قفل خودکار شبانه',
    autoLockDesc: 'تنظیم ساعات قفل اضطراری',
    accessNotifications: 'اعلان‌های دسترسی',
    auditMode: 'حالت ممیزی',
    biometricAuth: 'احراز هویت بیومتریک',
    biometricDesc: 'نیاز به FaceID/TouchID',
    biometricPrompt: 'لطفاً هویت خود را تأیید کنید',
    biometricFailed: 'احراز هویت ناموفق بود',

    language: 'زبان',
    defaultConfiguration: 'تنظیمات پیش‌فرض',
    defaultConfigDesc: 'تنظیمات اولیه سیستم',
    defaultTheme: 'تم پیش‌فرض',
    selectTheme: 'انتخاب تم',
    defaultLanguage: 'زبان پیش‌فرض',
    selectLanguage: 'انتخاب زبان',
    timerDuration: 'مدت زمان تایمر',
    theme_neon: 'نئون',
    theme_matrix: 'ماتریکس',
    theme_light: 'روشن',

    // Duress Mode
    duressMode: 'حالت اجبار (پنیک)',
    duressDesc: 'هشدار مخفی هنگام فشار',
    duressWarning: '⚠️ هشدار مخفی برای مدیران ارسال می‌شود',
    duressAlert: 'اجبار',
    duressAlertSent: '🚨 هشدار اجباری ارسال شد!',
    duressAlertDetailed: 'این دسترسی تحت فشار انجام شده است',

    // Secure Mode
    secureModeActive: '🛡️ حالت امنیتی فعال است',
    secureModeDesc: 'دسترسی در ساعات شبانه محدود شده',

    // Time
    startTime: 'ساعت شروع',
    endTime: 'ساعت پایان',
    timestamp: 'زمان',
    location: 'موقعیت',
    device: 'دستگاه',

    // System Info
    systemStatus: 'وضعیت سیستم',
    uptime: 'زمان فعالیت',
    version: 'نسخه',
    recentActivity: 'فعالیت های اخیر',
    last24Hours: '۲۴ ساعت گذشته',
    systemHealth: 'سلامت سیستم',
    cpu: 'پردازنده',
    memory: 'حافظه',
    network: 'شبکه',

    // Authentication
    login: 'ورود',
    logout: 'خروج',
    username: 'نام کاربری',
    password: 'رمز عبور',
    rememberMe: 'مرا به خاطر بسپار',
    forgotPassword: 'فراموشی رمز عبور؟',
    loginSuccess: 'ورود موفقیت‌آمیز!',
    invalidCredentials: 'نام کاربری یا رمز عبور اشتباه است',
    loginError: 'خطا در ورود به سیستم',
    usernamePlaceholder: 'نام کاربری را وارد کنید',
    passwordPlaceholder: 'رمز عبور را وارد کنید',
    role: 'نقش',
    clearanceLevel: 'سطح دسترسی',
    lastLogin: 'آخرین ورود',
    profileSettings: 'تنظیمات پروفایل',

    // OTP
    otpLogin: 'ورود با کد یکبار مصرف',
    otpDescription: 'کد یکبار مصرف به شماره شما ارسال می‌شود',
    phone: 'شماره موبایل',
    phonePlaceholder: '09123456789',
    sendOTP: 'ارسال کد',
    otpSent: 'کد یکبار مصرف ارسال شد',
    otpError: 'خطا در ارسال کد',
    invalidOTP: 'کد وارد شده نامعتبر است',
    otpVerifyError: 'خطا در تأیید کد',
    otpExpires: 'زمان باقی‌مانده',
    resendOTP: 'ارسال مجدد کد',
    loginWithOTP: 'ورود با کد یکبار مصرف',
    sending: 'در حال ارسال...',

    // 2FA
    '2faVerification': 'تأیید دو مرحله‌ای',
    '2faDescription': 'کد تأیید را از برنامه احراز هویت خود وارد کنید',
    '2faInstruction': 'کد ۶ رقمی را از برنامه احراز هویت خود وارد کنید',
    invalid2FA: 'کد تأیید نامعتبر است',
    '2faError': 'خطا در تأیید دو مرحله‌ای',

    // Password Recovery
    passwordRecovery: 'بازیابی رمز عبور',
    recoveryDescription: 'رمز عبور جدید خود را وارد کنید',
    verificationCode: 'کد تأیید',
    newPassword: 'رمز عبور جدید',
    confirmPassword: 'تأیید رمز عبور',
    passwordMismatch: 'رمز عبور و تأیید آن یکسان نیستند',
    passwordResetSuccess: 'رمز عبور با موفقیت تغییر یافت',
    passwordResetError: 'خطا در تغییر رمز عبور',
    resetPassword: 'تغییر رمز عبور',
    resetting: 'در حال تغییر...',

    // Register
    register: 'ثبت‌نام',

    // Common
    or: 'یا',
    backToLogin: 'بازگشت به ورود',
    loading: 'در حال ورود...',
    defaultCredentials: 'اطلاعات ورود پیش‌فرض',
    loginDescription: 'لطفاً اطلاعات خود را وارد کنید',
  },
  en: {
    // Header
    appName: 'SentryGate',
    serverRoom: 'Server Room Alpha-7',
    connected: 'Connected',
    offline: 'Offline',

    // Navigation
    dashboard: 'Dashboard',
    accessLogs: 'Access Logs',
    users: 'Users',
    settings: 'Settings',
    home: 'Home',
    logs: 'Logs',

    // Unlock Button
    pressAndHold: 'Press and hold to unlock',
    holdToUnlock: 'Hold to unlock...',
    unlocking: 'Unlocking...',
    unlocked: 'Unlocked',
    lockingIn: 'Locking in',
    seconds: 'seconds',

    // Stats
    temperature: 'Temperature',
    humidity: 'Humidity',
    ping: 'Ping',

    // Status
    good: 'good',
    warning: 'warning',
    normal: 'normal',
    success: 'success',
    error: 'error',
    pending: 'pending',

    // Logs
    accessGranted: 'Access Granted',
    accessDenied: 'Access Denied',
    unknown: 'Unknown',

    // Users
    authorizedUsers: 'Authorized Users',
    levelClearance: 'Level Clearance',

    // Settings
    systemSettings: 'System Settings',
    autoLockTimeout: 'Auto-Lock Schedule',
    autoLockDesc: 'Set emergency lockdown hours',
    accessNotifications: 'Access Notifications',
    auditMode: 'Audit Mode',
    biometricAuth: 'Biometric Authentication',
    biometricDesc: 'Require FaceID/TouchID',
    biometricPrompt: 'Please verify your identity',
    biometricFailed: 'Authentication failed',

    language: 'Language',
    defaultConfiguration: 'Default Configuration',
    defaultConfigDesc: 'Initial system settings',
    defaultTheme: 'Default Theme',
    selectTheme: 'Select Theme',
    defaultLanguage: 'Default Language',
    selectLanguage: 'Select Language',
    timerDuration: 'Timer Duration',
    theme_neon: 'Neon',
    theme_matrix: 'Matrix',
    theme_light: 'Light',

    // Duress Mode
    duressMode: 'Duress Mode (Panic)',
    duressDesc: 'Silent alert under coercion',
    duressWarning: '⚠️ Silent alert will be sent to administrators',
    duressAlert: 'Duress',
    duressAlertSent: '🚨 Duress alert sent!',
    duressAlertDetailed: 'This access was performed under duress',

    // Secure Mode
    secureModeActive: '🛡️ Secure Mode Active',
    secureModeDesc: 'Access restricted during night hours',

    // Time
    startTime: 'Start Time',
    endTime: 'End Time',
    timestamp: 'Time',
    location: 'Location',
    device: 'Device',

    // System Info
    systemStatus: 'System Status',
    uptime: 'Uptime',
    version: 'v',
    recentActivity: 'Recent Activity',
    last24Hours: 'Last 24 Hours',
    systemHealth: 'System Health',
    cpu: 'CPU',
    memory: 'Memory',
    network: 'Network',

    // Authentication
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginSuccess: 'Login successful!',
    invalidCredentials: 'Invalid username or password',
    loginError: 'Login error',
    usernamePlaceholder: 'Enter username',
    passwordPlaceholder: 'Enter password',
    role: 'Role',
    clearanceLevel: 'Clearance Level',
    lastLogin: 'Last Login',
    profileSettings: 'Profile Settings',

    // OTP
    otpLogin: 'Login with OTP',
    otpDescription: 'One-time password will be sent to your number',
    phone: 'Phone Number',
    phonePlaceholder: '09123456789',
    sendOTP: 'Send Code',
    otpSent: 'OTP sent successfully',
    otpError: 'Error sending OTP',
    invalidOTP: 'Invalid OTP code',
    otpVerifyError: 'Error verifying OTP',
    otpExpires: 'Time remaining',
    resendOTP: 'Resend code',
    loginWithOTP: 'Login with OTP',
    sending: 'Sending...',

    // 2FA
    '2faVerification': '2FA Verification',
    '2faDescription': 'Enter the code from your authenticator app',
    '2faInstruction': 'Enter the 6-digit code from your authenticator app',
    invalid2FA: 'Invalid verification code',
    '2faError': 'Two-factor authentication error',

    // Password Recovery
    passwordRecovery: 'Password Recovery',
    recoveryDescription: 'Enter your new password',
    verificationCode: 'Verification Code',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordMismatch: 'Passwords do not match',
    passwordResetSuccess: 'Password changed successfully',
    passwordResetError: 'Error changing password',
    resetPassword: 'Reset Password',
    resetting: 'Resetting...',

    // Register
    register: 'Register',

    // Common
    or: 'or',
    backToLogin: 'Back to login',
    loading: 'Loading...',
    defaultCredentials: 'Default Credentials',
    loginDescription: 'Please enter your credentials',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fa'); // Default to Persian

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fa] || key;
  };

  const isRTL = language === 'fa';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}