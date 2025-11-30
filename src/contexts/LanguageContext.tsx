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