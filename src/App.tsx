import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './features/auth/contexts/AuthContext';
import { AppSettingsProvider, useAppSettings } from './features/settings/contexts/AppSettingsContext';
import { Sidebar } from './layouts/Sidebar';
import { BottomNavigation } from './layouts/BottomNavigation';
import { LiquidUnlockButton } from './features/auth/components/LiquidUnlockButton';
import { StatsCard } from './features/dashboard/components/StatsCard';
import { LogFeedInteractive } from './features/logs/components/LogFeedInteractive';
import { LanguageSwitcher } from './features/settings/components/LanguageSwitcher';
import { ThemeSwitcher } from './features/settings/components/ThemeSwitcher';
import { SettingsPanel } from './features/settings/components/SettingsPanel';
import { ActivityTimeline } from './features/dashboard/components/ActivityTimeline';
import { UserProfile } from './features/user/components/UserProfile';
import { ProfileSettings } from './features/settings/components/ProfileSettings';
import { LoginPanel } from './features/auth/components/LoginPanel';
import { Thermometer, Droplets, Activity, Users } from 'lucide-react';

function AppContent() {
  const { t, isRTL } = useLanguage();
  const { theme } = useAppSettings();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [logs, setLogs] = useState([
    {
      id: 1,
      user: 'سارا احمدی',
      action: 'accessGranted',
      timestamp: '14:32:45',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'iPhone 14 Pro',
      isDuress: false,
    },
    {
      id: 2,
      user: 'محمد رضایی',
      action: 'accessGranted',
      timestamp: '14:28:12',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Android Phone',
      isDuress: false,
    },
    {
      id: 3,
      user: 'ناشناس',
      action: 'accessDenied',
      timestamp: '14:15:03',
      status: 'error' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Unknown',
      isDuress: false,
    },
    {
      id: 4,
      user: 'علی کریمی',
      action: 'accessGranted',
      timestamp: '13:58:27',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Samsung Galaxy',
      isDuress: true, // Duress entry example
    },
  ]);

  const [stats, setStats] = useState({
    temperature: 18.5,
    humidity: 45,
    ping: 12,
  });

  // Apply RTL to body
  useEffect(() => {
    if (isRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
      document.documentElement.dir = 'rtl'; // Ensure global dir attribute
      document.documentElement.lang = 'fa';
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }, [isRTL]);

  // Apply Theme styles
  useEffect(() => {
    document.body.classList.remove('hacker-mode', 'light');
    if (theme === 'matrix') {
      document.body.classList.add('hacker-mode');
    }
  }, [theme]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        temperature: +(prev.temperature + (Math.random() - 0.5) * 0.5).toFixed(1),
        humidity: Math.max(40, Math.min(60, prev.humidity + Math.floor((Math.random() - 0.5) * 3))),
        ping: Math.max(8, Math.min(25, prev.ping + Math.floor((Math.random() - 0.5) * 4))),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleUnlock = (isDuress?: boolean) => {
    const newLog = {
      id: Date.now(),
      user: 'کاربر فعلی',
      action: 'accessGranted',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Web App',
      isDuress: isDuress || false,
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">{t('loading') || 'در حال بارگذاری...'}</p>
        </div>
      </div>
    );
  }

  // Show only LoginPanel when not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'} ${theme === 'matrix' ? 'hacker-mode' : ''}`}>
        {/* Aurora Background (Neon Theme) */}
        {theme === 'neon' && (
          <div className="fixed inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00F0FF] rounded-full blur-[150px] animate-aurora-1" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF9D] rounded-full blur-[150px] animate-aurora-2" />
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[150px] animate-aurora-3" />
          </div>
        )}

        {/* Matrix Rain Background (Matrix Theme) */}
        {theme === 'matrix' && (
          <div className="fixed inset-0 opacity-20 pointer-events-none">
            <div className="hacker-grid" />
          </div>
        )}

        {/* Login Panel - Always open when not authenticated */}
        <LoginPanel isOpen={true} onClose={() => { }} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-3 md:space-y-4">
            {/* Hero Section - Compact */}
            <div className="relative">
              {/* Animated gradient background */}
              <motion.div
                className="absolute inset-0 opacity-20 rounded-3xl overflow-hidden -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                transition={{ duration: 1 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, var(--liquid-primary)20 0%, transparent 70%)',
                  }}
                />
              </motion.div>

              <div className="flex flex-col items-center justify-center py-3 md:py-4">
                <LiquidUnlockButton onUnlock={handleUnlock} />
              </div>
            </div>

            {/* Stats Grid - Compact */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <StatsCard
                  icon={<Thermometer className="w-6 h-6" />}
                  label={t('temperature')}
                  value={`${stats.temperature}°C`}
                  status={stats.temperature > 20 ? 'warning' : 'normal'}
                  trend="stable"
                />
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <StatsCard
                  icon={<Droplets className="w-6 h-6" />}
                  label={t('humidity')}
                  value={`${stats.humidity}%`}
                  status={stats.humidity > 55 ? 'warning' : 'normal'}
                  trend="down"
                />
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <StatsCard
                  icon={<Activity className="w-6 h-6" />}
                  label={t('ping')}
                  value={`${stats.ping}ms`}
                  status={stats.ping > 20 ? 'warning' : 'good'}
                  trend="up"
                />
              </motion.div>
            </motion.div>

            {/* Activity Timeline Section - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <ActivityTimeline
                activities={logs.slice(0, 3).map((log) => ({
                  id: log.id,
                  type: log.status === 'success' ? 'success' : log.status === 'error' ? 'error' : 'warning',
                  message: `${log.user} - ${t(log.action)} • ${log.location}`,
                  timestamp: log.timestamp,
                }))}
                maxItems={3}
              />
            </motion.div>

            {/* Mobile Bottom Spacer - Smart spacing for navigation */}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            <h2 className="text-[#00F0FF] tracking-wide">{t('accessLogs')}</h2>
            <LogFeedInteractive logs={logs} />

            {/* Mobile Bottom Spacer - Smart spacing for navigation */}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <h2 className="text-[#00F0FF] tracking-wide">{t('authorizedUsers')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['سارا احمدی', 'محمد رضایی', 'علی کریمی', 'فاطمه زارعی'].map((user, idx) => (
                <div
                  key={idx}
                  className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-[#00F0FF]/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#050505]" />
                    </div>
                    <div>
                      <div className="text-white/90">{user}</div>
                      <div className="text-white/40 text-sm">{t('levelClearance')} {idx + 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Bottom Spacer - Smart spacing for navigation */}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
          </div>
        );

      case 'settings':
        return <SettingsPanel />;

      case 'profile':
        return <ProfileSettings />;

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'} ${theme === 'matrix' ? 'hacker-mode' : ''}`}>
      {/* Aurora Background (Neon Theme) */}
      {theme === 'neon' && (
        <div className="fixed inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00F0FF] rounded-full blur-[150px] animate-aurora-1" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF9D] rounded-full blur-[150px] animate-aurora-2" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[150px] animate-aurora-3" />
        </div>
      )}

      {/* Matrix Rain Background (Matrix Theme) */}
      {theme === 'matrix' && (
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="hacker-grid" />
        </div>
      )}



      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <div className={`relative z-10 ${isRTL ? 'md:mr-64' : 'md:ml-64'} transition-all duration-300`}>
        {/* Header */}
        <header
          className="glass-card sticky top-0 z-[100] px-4 md:px-6 py-3 md:py-4"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(0, 240, 255, 0.05)',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1
                className={`tracking-wide text-base md:text-lg font-bold ${theme === 'matrix' ? 'font-mono' : ''}`}
                style={{
                  color: theme === 'matrix' ? '#00FF00' : '#00F0FF',
                  textShadow: theme === 'matrix'
                    ? '0 0 10px rgba(0, 255, 0, 0.5)'
                    : '0 0 15px rgba(0, 240, 255, 0.3)',
                }}
              >
                {theme === 'matrix' ? '> ' : ''}{t('appName')}
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <UserProfile onNavigate={setActiveTab} />
            </div>
          </div>
        </header>

        {/* Content Area - Enhanced padding for mobile bottom nav */}
        <main className="pt-6 px-4 pb-36 md:px-6 md:pt-6 md:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppSettingsProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppSettingsProvider>
    </LanguageProvider>
  );
}
