import { motion } from 'motion/react';
import { Home, FileText, Users, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', labelKey: 'dashboard', icon: Home },
  { id: 'logs', labelKey: 'accessLogs', icon: FileText },
  { id: 'users', labelKey: 'users', icon: Users },
  { id: 'settings', labelKey: 'settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t, isRTL } = useLanguage();

  return (
    <aside
      className="fixed top-0 h-screen w-64 glass-card backdrop-blur-xl border-white/10 p-6 z-20"
      style={{
        [isRTL ? 'right' : 'left']: 0,
        [isRTL ? 'borderLeft' : 'borderRight']: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Logo */}
      <div className="mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#050505] rounded-md" />
          </div>
          <div>
            <h2 className="text-[#00F0FF] tracking-wide">{t('appName')}</h2>
            <p className="text-white/30 text-xs">{t('version')}2.4.1</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors overflow-hidden group"
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 glass-card border border-[#00F0FF]/30"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
                  }}
                  transition={{ type: 'spring', duration: 0.6, bounce: 0.2 }}
                />
              )}

              {/* Hover Effect */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl" />
              )}

              {/* Icon */}
              <div className="relative z-10">
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{
                    color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.5)',
                  }}
                />
              </div>

              {/* Label */}
              <span
                className="relative z-10 transition-colors"
                style={{
                  color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {t(item.labelKey)}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00F0FF] rounded-full"
                  style={{
                    [isRTL ? 'left' : 'right']: 0,
                    [isRTL ? 'borderTopRightRadius' : 'borderTopLeftRadius']: '9999px',
                    [isRTL ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: '9999px',
                    boxShadow: '0 0 10px #00F0FF',
                  }}
                  layoutId="sidebar-active-indicator"
                  transition={{ type: 'spring', duration: 0.6, bounce: 0.2 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Info */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="glass-card backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <p className="text-white/40 text-xs">{t('systemStatus')}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-white/70 text-sm">{t('uptime')}</span>
            <span className="text-[#00FF9D] text-sm">99.8%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}