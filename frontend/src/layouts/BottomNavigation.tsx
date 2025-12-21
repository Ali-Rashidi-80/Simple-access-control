import { motion } from 'motion/react';
import { Home, FileText, Users, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { useMemo } from 'react';

const navItems = [
  { id: 'home', labelKey: 'home', icon: Home },
  { id: 'logs', labelKey: 'logs', icon: FileText },
  { id: 'users', labelKey: 'users', icon: Users },
  { id: 'settings', labelKey: 'settings', icon: Settings },
];

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { t } = useLanguage();
  const { isLowPerformance, prefersReducedMotion } = usePerformanceMode();

  // PERFORMANCE: Disable animations on low-end devices
  const shouldAnimate = !isLowPerformance && !prefersReducedMotion;

  // PERFORMANCE: Memoize static data
  const memoizedNavItems = useMemo(() => navItems, []);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
      className="fixed bottom-0 z-50"
      style={{
        left: '12px',
        right: '12px',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      }}
    >
      <div
        className="glass-card rounded-2xl"
        style={{
          padding: '10px 12px',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          {memoizedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 rounded-xl touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{
                  minHeight: '56px',
                  padding: '8px 4px',
                }}
              >
                {/* Active Background Blob - PERF: Static fallback on low-end */}
                {isActive && (
                  shouldAnimate ? (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%)',
                        boxShadow: 'inset 0 0 20px rgba(0, 240, 255, 0.15), 0 0 16px rgba(0, 240, 255, 0.2)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                      }}
                      transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                      }}
                    />
                  )
                )}

                {/* Icon Container */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative z-10"
                >
                  <Icon
                    className="w-6 h-6 transition-all duration-200"
                    style={{
                      color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.6)',
                      filter: isActive ? 'drop-shadow(0 0 8px #00F0FF)' : 'none',
                    }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  className="relative z-10 text-[11px] font-medium tracking-wide leading-tight"
                  animate={{
                    color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.45)',
                    opacity: isActive ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.15 }}
                  style={{
                    textShadow: isActive ? '0 0 10px rgba(0, 240, 255, 0.5)' : 'none',
                  }}
                >
                  {t(item.labelKey)}
                </motion.span>

                {/* Active Dot Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-0.5 w-1 h-1 bg-[#00F0FF] rounded-full"
                    style={{
                      boxShadow: '0 0 8px #00F0FF, 0 0 12px #00F0FF',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
