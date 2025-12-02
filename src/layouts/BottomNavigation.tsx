import { motion } from 'motion/react';
import { Home, FileText, Users, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', labelKey: 'home', icon: Home },
  { id: 'logs', labelKey: 'logs', icon: FileText },
  { id: 'users', labelKey: 'users', icon: Users },
  { id: 'settings', labelKey: 'settings', icon: Settings },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { t } = useLanguage();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-4 left-4 right-4 z-50"
    >
      <div className="glass-card backdrop-blur-xl border border-white/20 rounded-3xl px-6 py-4 shadow-2xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex flex-col items-center gap-1 px-4 py-2 group"
                whileTap={{ scale: 0.9 }}
              >
                {/* Active Background Blob */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                    }}
                    transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
                  />
                )}

                {/* Icon Container */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative z-10"
                >
                  <Icon
                    className="w-6 h-6 transition-colors duration-300"
                    style={{
                      color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.5)',
                      filter: isActive ? 'drop-shadow(0 0 8px #00F0FF)' : 'none',
                    }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  className="relative z-10 text-xs tracking-wide"
                  animate={{
                    color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.4)',
                    scale: isActive ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {t(item.labelKey)}
                </motion.span>

                {/* Active Dot Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 w-1.5 h-1.5 bg-[#00F0FF] rounded-full"
                    style={{
                      boxShadow: '0 0 8px #00F0FF',
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Safe Area for iOS devices */}
      <div className="h-safe-area-inset-bottom" />
    </motion.nav>
  );
}