import { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation } from './components/BottomNavigation';
import { ConnectionStatus } from './components/ConnectionStatus';
import { LiquidUnlockButton } from './components/LiquidUnlockButton';
import { StatsCard } from './components/StatsCard';
import { LogFeed } from './components/LogFeed';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Thermometer, Droplets, Activity, Users, Settings } from 'lucide-react';

function AppContent() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(true);
  const [logs, setLogs] = useState([
    { id: 1, user: 'سارا احمدی', action: 'accessGranted', timestamp: '14:32:45', status: 'success' as const },
    { id: 2, user: 'محمد رضایی', action: 'accessGranted', timestamp: '14:28:12', status: 'success' as const },
    { id: 3, user: 'ناشناس', action: 'accessDenied', timestamp: '14:15:03', status: 'error' as const },
    { id: 4, user: 'علی کریمی', action: 'accessGranted', timestamp: '13:58:27', status: 'success' as const },
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
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }, [isRTL]);

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

  // Simulate connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleUnlock = () => {
    const newLog = {
      id: Date.now(),
      user: 'کاربر فعلی',
      action: 'accessGranted',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'success' as const,
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="flex flex-col items-center justify-center py-8 md:py-12">
              <LiquidUnlockButton onUnlock={handleUnlock} />
            </div>

            {/* Stats Grid - Bento Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <StatsCard
                icon={<Thermometer className="w-6 h-6" />}
                label={t('temperature')}
                value={`${stats.temperature}°C`}
                status={stats.temperature > 20 ? 'warning' : 'normal'}
                trend="stable"
              />
              <StatsCard
                icon={<Droplets className="w-6 h-6" />}
                label={t('humidity')}
                value={`${stats.humidity}%`}
                status={stats.humidity > 55 ? 'warning' : 'normal'}
                trend="stable"
              />
              <StatsCard
                icon={<Activity className="w-6 h-6" />}
                label={t('ping')}
                value={`${stats.ping}ms`}
                status={stats.ping > 20 ? 'warning' : 'good'}
                trend="stable"
              />
            </div>

            {/* Recent Logs Preview */}
            <div className="block md:hidden">
              <LogFeed logs={logs.slice(0, 3)} compact />
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            <h2 className="text-[#00F0FF] tracking-wide">{t('accessLogs')}</h2>
            <LogFeed logs={logs} />
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
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-[#00F0FF] tracking-wide">{t('systemSettings')}</h2>
            <div className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10">
              <div className="space-y-4">
                {[
                  t('autoLockTimeout'),
                  t('accessNotifications'),
                  t('auditMode'),
                  t('biometricAuth')
                ].map((setting, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <span className="text-white/70">{setting}</span>
                    <div className="w-12 h-6 bg-[#00F0FF]/20 rounded-full flex items-center px-1 cursor-pointer hover:bg-[#00F0FF]/30 transition-colors">
                      <div className="w-4 h-4 bg-[#00F0FF] rounded-full shadow-lg shadow-[#00F0FF]/50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Aurora Background */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00F0FF] rounded-full blur-[150px] animate-aurora-1" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF9D] rounded-full blur-[150px] animate-aurora-2" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[150px] animate-aurora-3" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <div className={`relative z-10 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
        {/* Header */}
        <header className="glass-card backdrop-blur-xl border-b border-white/10 px-6 py-4 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#00F0FF] tracking-wide text-xl md:text-2xl">{t('appName')}</h1>
              <p className="text-white/40 text-sm mt-1">{t('serverRoom')}</p>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6 md:p-8 pb-24 md:pb-8">
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
      <AppContent />
    </LanguageProvider>
  );
}
