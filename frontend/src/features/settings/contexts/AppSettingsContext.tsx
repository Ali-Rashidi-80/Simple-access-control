import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { api } from '../../../utils/api';
import { usePerformanceMode } from '../../../hooks/usePerformanceMode';

export type Theme = 'neon' | 'matrix' | 'light';

// Default values when backend is unavailable
const DEFAULT_SETTINGS = {
  theme: 'neon' as Theme,
  language: 'fa',
  auto_lock_start: 22,
  auto_lock_end: 6,
  timer_duration: 5,
  require_biometric: false,
  duress_mode: false,
  performance_mode: 'auto' as PerformanceMode
};

export type PerformanceMode = 'auto' | 'high' | 'low';

interface AppSettingsContextType {
  isSecureMode: boolean;
  requireBiometric: boolean;
  isDuressMode: boolean;
  theme: Theme;
  timerDuration: number;
  autoLockStart: number;
  autoLockEnd: number;
  defaultLanguage: string;
  isLoading: boolean;
  // Performance settings
  performanceMode: PerformanceMode;
  isLowPerformance: boolean;
  setPerformanceMode: (value: PerformanceMode) => void;
  // Setters
  setRequireBiometric: (value: boolean) => void;
  setIsDuressMode: (value: boolean) => void;
  setTheme: (value: Theme) => void;
  setTimerDuration: (value: number) => void;
  setAutoLockTimes: (start: number, end: number) => void;
  setDefaultLanguage: (value: string) => void;
  saveSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { setLanguage } = useLanguage();
  const { isLowPerformance: autoIsLowPerformance, performanceMode: hookPerformanceMode, setPerformanceMode: hookSetPerformanceMode } = usePerformanceMode();
  const [isLoading, setIsLoading] = useState(true);
  const [requireBiometric, setRequireBiometricState] = useState(DEFAULT_SETTINGS.require_biometric);
  const [isDuressMode, setIsDuressModeState] = useState(DEFAULT_SETTINGS.duress_mode);
  const [theme, setThemeState] = useState<Theme>(DEFAULT_SETTINGS.theme);
  const [timerDuration, setTimerDurationState] = useState(DEFAULT_SETTINGS.timer_duration);
  const [autoLockStart, setAutoLockStart] = useState(DEFAULT_SETTINGS.auto_lock_start);
  const [autoLockEnd, setAutoLockEnd] = useState(DEFAULT_SETTINGS.auto_lock_end);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [defaultLanguage, setDefaultLanguageState] = useState(DEFAULT_SETTINGS.language);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get<{ settings: Record<string, string> }>('/settings/');
        const s = response.settings;

        if (s.theme && ['neon', 'matrix', 'light'].includes(s.theme)) {
          setThemeState(s.theme as Theme);
        }
        if (s.language) setDefaultLanguageState(s.language);
        if (s.auto_lock_start) setAutoLockStart(parseInt(s.auto_lock_start));
        if (s.auto_lock_end) setAutoLockEnd(parseInt(s.auto_lock_end));
        if (s.timer_duration) setTimerDurationState(parseInt(s.timer_duration));
        if (s.require_biometric) setRequireBiometricState(s.require_biometric === 'true');
        if (s.duress_mode) setIsDuressModeState(s.duress_mode === 'true');

      } catch (error) {
        console.warn('Failed to load settings from server, using defaults:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('sentry_token');
      if (!token) return; // No auth, can't save

      await api.put('/settings/', {
        settings: {
          theme,
          language: defaultLanguage,
          auto_lock_start: autoLockStart.toString(),
          auto_lock_end: autoLockEnd.toString(),
          timer_duration: timerDuration.toString(),
          require_biometric: requireBiometric.toString(),
          duress_mode: isDuressMode.toString()
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [theme, defaultLanguage, autoLockStart, autoLockEnd, timerDuration, requireBiometric, isDuressMode]);

  // Auto-save settings when they change
  useEffect(() => {
    if (!isLoading) {
      const timeout = setTimeout(saveSettings, 500);
      return () => clearTimeout(timeout);
    }
  }, [theme, defaultLanguage, autoLockStart, autoLockEnd, timerDuration, requireBiometric, isDuressMode, isLoading, saveSettings]);

  // Check if current time is within secure mode hours
  useEffect(() => {
    const checkSecureMode = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const inSecureMode = currentHour >= autoLockStart && currentHour < autoLockEnd;
      setIsSecureMode(inSecureMode);
    };

    checkSecureMode();
    const interval = setInterval(checkSecureMode, 60000);
    return () => clearInterval(interval);
  }, [autoLockStart, autoLockEnd]);

  // Apply default language on mount
  useEffect(() => {
    setLanguage(defaultLanguage as 'fa' | 'en');
  }, [defaultLanguage, setLanguage]);

  // Setter functions with auto-save
  const setRequireBiometric = (value: boolean) => setRequireBiometricState(value);
  const setIsDuressMode = (value: boolean) => setIsDuressModeState(value);
  const setTheme = (value: Theme) => setThemeState(value);
  const setTimerDuration = (value: number) => setTimerDurationState(value);
  const setDefaultLanguage = (value: string) => setDefaultLanguageState(value);

  const setAutoLockTimes = (start: number, end: number) => {
    setAutoLockStart(start);
    setAutoLockEnd(end);
  };

  // PERFORMANCE: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isSecureMode,
    requireBiometric,
    isDuressMode,
    theme,
    timerDuration,
    autoLockStart,
    autoLockEnd,
    defaultLanguage,
    isLoading,
    // Performance settings from hook
    performanceMode: hookPerformanceMode,
    isLowPerformance: autoIsLowPerformance,
    setPerformanceMode: hookSetPerformanceMode,
    // Setters
    setRequireBiometric,
    setIsDuressMode,
    setTheme,
    setTimerDuration,
    setAutoLockTimes,
    setDefaultLanguage,
    saveSettings,
  }), [
    isSecureMode, requireBiometric, isDuressMode, theme, timerDuration,
    autoLockStart, autoLockEnd, defaultLanguage, isLoading,
    hookPerformanceMode, autoIsLowPerformance, hookSetPerformanceMode, saveSettings
  ]);

  return (
    <AppSettingsContext.Provider value={contextValue}>
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

