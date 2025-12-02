import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

export type Theme = 'neon' | 'matrix' | 'light';

interface AppSettingsContextType {
  isSecureMode: boolean;
  requireBiometric: boolean;
  isDuressMode: boolean;
  theme: Theme;
  timerDuration: number;
  autoLockStart: number;
  autoLockEnd: number;
  defaultLanguage: string;
  setRequireBiometric: (value: boolean) => void;
  setIsDuressMode: (value: boolean) => void;
  setTheme: (value: Theme) => void;
  setTimerDuration: (value: number) => void;
  setAutoLockTimes: (start: number, end: number) => void;
  setDefaultLanguage: (value: string) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { setLanguage } = useLanguage();
  const [requireBiometric, setRequireBiometric] = useState(false); // Default false per request
  const [isDuressMode, setIsDuressMode] = useState(false);
  const [theme, setTheme] = useState<Theme>('neon');
  const [timerDuration, setTimerDuration] = useState(5);
  const [autoLockStart, setAutoLockStart] = useState(0); // 12 AM (midnight)
  const [autoLockEnd, setAutoLockEnd] = useState(6); // 6 AM
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState('fa');

  // Check if current time is within secure mode hours
  useEffect(() => {
    const checkSecureMode = () => {
      const now = new Date();
      const currentHour = now.getHours();

      // Check if current hour is between autoLockStart and autoLockEnd
      const inSecureMode = currentHour >= autoLockStart && currentHour < autoLockEnd;
      setIsSecureMode(inSecureMode);
    };

    // Check immediately
    checkSecureMode();

    // Check every minute
    const interval = setInterval(checkSecureMode, 60000);

    return () => clearInterval(interval);
  }, [autoLockStart, autoLockEnd]);

  // Apply default language on mount
  useEffect(() => {
    setLanguage(defaultLanguage as 'fa' | 'en');
  }, [defaultLanguage, setLanguage]);

  const setAutoLockTimes = (start: number, end: number) => {
    setAutoLockStart(start);
    setAutoLockEnd(end);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        isSecureMode,
        requireBiometric,
        isDuressMode,
        theme,
        timerDuration,
        autoLockStart,
        autoLockEnd,
        defaultLanguage,
        setRequireBiometric,
        setIsDuressMode,
        setTheme,
        setTimerDuration,
        setAutoLockTimes,
        setDefaultLanguage,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
