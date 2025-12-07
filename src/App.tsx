import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { Thermometer, Droplets, Activity, Users, X, CheckCircle, XCircle, Clock, Eye, Edit3, ShieldOff, Trash2, ArrowLeft } from 'lucide-react';

// User type for UsersSection
interface UserData {
  id: number;
  name: string;
  level: number;
  status: 'online' | 'offline' | 'busy';
  total: number;
  success: number;
  error: number;
  pending: number;
}

interface UsersSectionProps {
  usersData: UserData[];
  t: (key: string) => string;
  theme: string;
}

// UsersSection Component with User Management Popup
function UsersSection({ usersData, t, theme }: UsersSectionProps) {
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { isRTL } = useLanguage();

  const primaryColor = theme === 'matrix' ? '#00FF00' : '#00F0FF';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00FF9D';
      case 'offline': return '#64748b';
      case 'busy': return '#FF2E2E';
      default: return '#00F0FF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return t('online') || 'آنلاین';
      case 'offline': return t('offline') || 'آفلاین';
      case 'busy': return t('busy') || 'مشغول';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="tracking-wide" style={{ color: primaryColor }}>{t('authorizedUsers') || 'کاربران مجاز'}</h2>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usersData.map((user) => (
          <motion.div
            key={user.id}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedUser(user)}
            className="glass-card p-5 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-[#00F0FF]/40 transition-all duration-300 cursor-pointer group"
            style={{
              boxShadow: 'none',
            }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}AA)`,
                    color: '#050505',
                  }}
                >
                  {user.name.charAt(0)}
                </div>
                {/* Status Dot */}
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                  style={{
                    background: getStatusColor(user.status),
                    borderColor: theme === 'matrix' ? '#000' : '#0a0a14',
                  }}
                />
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="text-white/90 font-semibold text-base">{user.name}</div>
                <div className="text-white/40 text-sm">{t('levelClearance') || 'سطح دسترسی'} {user.level}</div>
              </div>

              {/* Stats Preview */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                  <CheckCircle className="w-3 h-3 text-[#00FF9D]" />
                  <span className="text-xs text-white/60">{user.success}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                  <XCircle className="w-3 h-3 text-[#FF2E2E]" />
                  <span className="text-xs text-white/60">{user.error}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* User Management Popup - Responsive */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[999] flex items-center justify-center px-3 py-4 pb-20 sm:p-6 md:p-8"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative w-[90%] max-w-[430px] sm:w-[430px] md:w-[460px] lg:w-[460px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative rounded-2xl border overflow-hidden"
                style={{
                  background: theme === 'matrix'
                    ? 'linear-gradient(145deg, rgba(0, 30, 0, 0.98), rgba(0, 20, 0, 0.99))'
                    : 'linear-gradient(145deg, rgba(15, 15, 35, 0.98), rgba(10, 10, 30, 0.99))',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}
              >
                {/* Header - Inline Compact */}
                <div
                  className="relative p-4 flex items-center gap-4"
                  style={{
                    background: `linear-gradient(180deg, ${primaryColor}12, transparent)`,
                  }}
                >
                  {/* Close Button */}
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all flex-shrink-0"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
                        color: '#fff',
                      }}
                    >
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                      style={{
                        background: getStatusColor(selectedUser.status),
                        borderColor: theme === 'matrix' ? '#001a00' : '#0f0f23',
                      }}
                    />
                  </div>

                  {/* Name & Level */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{selectedUser.name}</h3>
                    <p className="text-xs text-white/50">{t('levelClearance') || 'سطح دسترسی'} {selectedUser.level}</p>
                  </div>
                </div>

                {/* Stats - Horizontal Row with Flex */}
                <div className="px-4 py-3 border-t border-white/5">
                  <div className="flex gap-2">
                    {[
                      { key: 'total', label: t('total') || 'کل', value: selectedUser.total, color: primaryColor },
                      { key: 'success', label: t('success') || 'موفق', value: selectedUser.success, color: '#00FF9D' },
                      { key: 'error', label: t('error') || 'خطا', value: selectedUser.error, color: '#FF2E2E' },
                      { key: 'pending', label: t('pending') || 'انتظار', value: selectedUser.pending, color: '#FFB800' },
                    ].map((stat) => (
                      <div
                        key={stat.key}
                        className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl"
                        style={{
                          background: `${stat.color}10`,
                          border: `1px solid ${stat.color}20`,
                        }}
                      >
                        <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
                        <span className="text-[10px] text-white/50">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 pt-3 space-y-2">
                  <button
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97]"
                    style={{
                      background: `${primaryColor}15`,
                      border: `1px solid ${primaryColor}30`,
                      color: primaryColor,
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('viewLogs') || 'مشاهده لاگ'}</span>
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97]"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#a855f7',
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('edit') || 'ویرایش'}</span>
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97]"
                    style={{
                      background: 'rgba(255, 184, 0, 0.12)',
                      border: '1px solid rgba(255, 184, 0, 0.25)',
                      color: '#FFB800',
                    }}
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span>{t('suspend') || 'تعلیق'}</span>
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97]"
                    style={{
                      background: 'rgba(255, 46, 46, 0.12)',
                      border: '1px solid rgba(255, 46, 46, 0.25)',
                      color: '#FF2E2E',
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete') || 'حذف'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Spacer */}
      <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
    </div>
  );
}

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
            <LogFeedInteractive logs={logs} />

            {/* Mobile Bottom Spacer - Smart spacing for navigation */}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
          </div>
        );

      case 'users':
        // Mock user data with stats
        const usersData: UserData[] = [
          { id: 1, name: 'سارا احمدی', level: 1, status: 'online' as const, total: 45, success: 42, error: 2, pending: 1 },
          { id: 2, name: 'محمد رضایی', level: 2, status: 'online' as const, total: 32, success: 30, error: 1, pending: 1 },
          { id: 3, name: 'علی کریمی', level: 3, status: 'offline' as const, total: 28, success: 25, error: 3, pending: 0 },
          { id: 4, name: 'فاطمه زارعی', level: 4, status: 'busy' as const, total: 15, success: 14, error: 0, pending: 1 },
        ];

        return (
          <UsersSection usersData={usersData} t={t} theme={theme} />
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
