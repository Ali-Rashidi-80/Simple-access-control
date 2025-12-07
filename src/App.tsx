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
import { Thermometer, Activity, Users, ArrowLeft, Shield, Trash2, Lock, Unlock, Edit } from 'lucide-react';

function AppContent() {
  const { t, isRTL } = useLanguage();
  const { theme } = useAppSettings();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedUser, setSelectedUser] = useState<{ name: string; level: number } | null>(null);
  const [logs, setLogs] = useState([
    {
      id: 1,
      user: 'سارا احمدی',
      action: 'accessGranted',
      timestamp: '2025-12-07 14:32:45',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'iPhone 14 Pro',
      isDuress: false,
    },
    {
      id: 2,
      user: 'محمد رضایی',
      action: 'accessGranted',
      timestamp: '2025-12-06 14:28:12',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Android Phone',
      isDuress: false,
    },
    {
      id: 3,
      user: 'ناشناس',
      action: 'accessDenied',
      timestamp: '2025-12-05 14:15:03',
      status: 'error' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Unknown',
      isDuress: false,
    },
    {
      id: 4,
      user: 'علی کریمی',
      action: 'accessGranted',
      timestamp: '2025-12-01 13:58:27',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Samsung Galaxy',
      isDuress: true,
    },
    {
      id: 5,
      user: 'فاطمه زارعی',
      action: 'accessGranted',
      timestamp: '2025-11-30 09:15:00',
      status: 'success' as const,
      location: 'اتاق سرور آلفا-۷',
      device: 'Web App',
      isDuress: false,
    },
  ]);

  const [stats, setStats] = useState({
    temperature: 18.5,
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
      timestamp: new Date().toISOString().slice(0, 10) + ' ' + new Date().toLocaleTimeString('en-US', { hour12: false }),
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
              className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
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
                <motion.div
                  key={idx}
                  className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-[#00F0FF]/30 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedUser({ name: user, level: idx + 1 })}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#050505]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white/90">{user}</div>
                      <div className="text-white/40 text-sm">{t('levelClearance')} {idx + 1}</div>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-[#00FF9D] animate-pulse" title={t('active')} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* User Control Modal */}
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedUser(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="relative rounded-3xl border-2 overflow-hidden"
                    style={{
                      background: theme === 'matrix'
                        ? 'linear-gradient(145deg, rgba(0, 30, 0, 0.98), rgba(0, 20, 0, 0.99))'
                        : 'linear-gradient(145deg, rgba(15, 15, 35, 0.98), rgba(10, 10, 30, 0.99))',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(40px)',
                    }}
                  >
                    {/* Header with Back Button */}
                    <div
                      className="relative p-5 pb-4"
                      style={{
                        background: 'linear-gradient(180deg, rgba(0, 240, 255, 0.08), transparent)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => setSelectedUser(null)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center border bg-black/30 hover:bg-[#00F0FF]/20 hover:border-[#00F0FF]/50 transition-all"
                          style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ArrowLeft className={`w-5 h-5 text-white/60 ${isRTL ? 'rotate-180' : ''}`} />
                        </motion.button>
                        <div>
                          <h3 className="text-lg font-bold text-white">{t('userControl')}</h3>
                          <p className="text-xs text-white/40">{t('permissions')}</p>
                        </div>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center text-2xl font-bold text-[#050505]" style={{ width: '72px', height: '72px' }}>
                          {selectedUser.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-1">{selectedUser.name}</h4>
                          <p className="text-sm text-white/50">{t('levelClearance')} {selectedUser.level}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#00FF9D] animate-pulse" />
                            <span className="text-xs text-[#00FF9D] font-medium">{t('active')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Cards - Square Brick Layout */}
                      <div className="flex gap-3 mb-5">
                        <div className="flex-1 aspect-square max-h-24 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">{t('lastAccess')}</p>
                          <p className="text-base text-white font-bold">2025-12-07</p>
                        </div>
                        <div className="flex-1 aspect-square max-h-24 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">{t('accessHistory')}</p>
                          <p className="text-base text-white font-bold">۱۲۵</p>
                          <p className="text-[10px] text-white/40">{t('items')}</p>
                        </div>
                        <div className="flex-1 aspect-square max-h-24 p-4 rounded-2xl bg-[#00FF9D]/10 border border-[#00FF9D]/20 flex flex-col items-center justify-center text-center">
                          <p className="text-[9px] text-[#00FF9D]/60 uppercase tracking-wider mb-2">{t('userStatus')}</p>
                          <div className="w-4 h-4 rounded-full bg-[#00FF9D] mb-1" />
                          <p className="text-[10px] text-[#00FF9D] font-medium">{t('active')}</p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(0, 240, 255, 0.08)',
                            borderColor: 'rgba(0, 240, 255, 0.2)',
                          }}
                        >
                          <Edit className="w-5 h-5 text-[#00F0FF]" />
                          <span className="text-white/90">{t('editUser')}</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(255, 184, 0, 0.08)',
                            borderColor: 'rgba(255, 184, 0, 0.2)',
                          }}
                        >
                          <Lock className="w-5 h-5 text-[#FFB800]" />
                          <span className="text-white/90">{t('blockUser')}</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(0, 255, 157, 0.08)',
                            borderColor: 'rgba(0, 255, 157, 0.2)',
                          }}
                        >
                          <Shield className="w-5 h-5 text-[#00FF9D]" />
                          <span className="text-white/90">{t('permissions')}</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all"
                          style={{
                            background: 'rgba(255, 46, 46, 0.08)',
                            borderColor: 'rgba(255, 46, 46, 0.2)',
                          }}
                        >
                          <Trash2 className="w-5 h-5 text-[#FF2E2E]" />
                          <span className="text-[#FF2E2E]">{t('deleteUser')}</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="p-4"
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <motion.button
                        onClick={() => setSelectedUser(null)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-xl border text-white/70 hover:text-white transition-all"
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {t('back')}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

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
