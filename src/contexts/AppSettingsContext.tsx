import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppSettingsContextType {
  isSecureMode: boolean;
  requireBiometric: boolean;
  isDuressMode: boolean;
  isHackerMode: boolean;
  autoLockStart: number;
  autoLockEnd: number;
  setRequireBiometric: (value: boolean) => void;
  setIsDuressMode: (value: boolean) => void;
  setIsHackerMode: (value: boolean) => void;
  setAutoLockTimes: (start: number, end: number) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [requireBiometric, setRequireBiometric] = useState(true);
  const [isDuressMode, setIsDuressMode] = useState(false);
  const [isHackerMode, setIsHackerMode] = useState(false);
  const [autoLockStart, setAutoLockStart] = useState(0); // 12 AM (midnight)
  const [autoLockEnd, setAutoLockEnd] = useState(6); // 6 AM
  const [isSecureMode, setIsSecureMode] = useState(false);

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
        isHackerMode,
        autoLockStart,
        autoLockEnd,
        setRequireBiometric,
        setIsDuressMode,
        setIsHackerMode,
        setAutoLockTimes,
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
