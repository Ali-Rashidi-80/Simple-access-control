import { motion } from 'motion/react';
import { Home, FileText, Users, Settings, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { useMemo } from 'react';

const navItems = [
    { id: 'home', labelKey: 'dashboard', icon: Home },
    { id: 'logs', labelKey: 'accessLogs', icon: FileText },
    { id: 'users', labelKey: 'users', icon: Users },
    { id: 'settings', labelKey: 'settings', icon: Settings },
];

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const { t, isRTL } = useLanguage();
    const { isLowPerformance, prefersReducedMotion } = usePerformanceMode();

    // PERFORMANCE: Disable animations on low-end devices
    const shouldAnimate = !isLowPerformance && !prefersReducedMotion;

    // PERFORMANCE: Memoize static navItems data
    const memoizedNavItems = useMemo(() => navItems, []);

    return (
        <aside
            className={`fixed top-0 h-screen w-64 glass-card p-0 z-20 transition-all duration-300 ${isRTL ? 'right-0 border-l border-white/10' : 'left-0 border-r border-white/10'
                }`}
            style={{
                backdropFilter: 'blur(var(--glass-blur-heavy, 24px))',
            }}
        >
            {/* Logo Section */}
            <motion.div
                className="px-6 pt-6 pb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <div className="flex items-center gap-3">
                    {/* Logo Icon */}
                    <motion.div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 255, 157, 0.15))',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
                        }}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        <Shield className="w-5 h-5 text-[#00F0FF]" />
                    </motion.div>
                    <div>
                        <h2
                            className="tracking-wide text-lg font-bold"
                            style={{
                                color: '#00F0FF',
                                textShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                            }}
                        >
                            {t('appName')}
                        </h2>
                        <p className="text-white/35 text-xs font-medium">{t('version')}2.4.1</p>
                    </div>
                </div>
            </motion.div>

            {/* Divider */}
            <div
                className="mx-4 h-px mb-4"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.2), transparent)'
                }}
            />

            {/* Navigation */}
            <nav className="px-3 space-y-1">
                {memoizedNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'
                                }`}
                        >
                            {/* Active Background - PERF: Use CSS transition on low-perf */}
                            {isActive && (
                                shouldAnimate ? (
                                    <motion.div
                                        layoutId="sidebar-active-bg"
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%)',
                                            border: '1px solid rgba(0, 240, 255, 0.25)',
                                            boxShadow: 'inset 0 0 20px rgba(0, 240, 255, 0.1), 0 0 15px rgba(0, 240, 255, 0.15)',
                                        }}
                                        transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                                    />
                                ) : (
                                    <div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%)',
                                            border: '1px solid rgba(0, 240, 255, 0.25)',
                                        }}
                                    />
                                )
                            )}

                            {/* Hover Effect */}
                            {!isActive && (
                                <div
                                    className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-200 rounded-xl"
                                />
                            )}

                            {/* Icon */}
                            <motion.div
                                className="relative z-10"
                                animate={{
                                    scale: isActive ? 1.1 : 1,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <Icon
                                    className="w-5 h-5 transition-all duration-200"
                                    style={{
                                        color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.55)',
                                        filter: isActive ? 'drop-shadow(0 0 6px #00F0FF)' : 'none',
                                    }}
                                    strokeWidth={isActive ? 2.2 : 2}
                                />
                            </motion.div>

                            {/* Label */}
                            <span
                                className="relative z-10 transition-all duration-200 flex-1 font-medium text-sm"
                                style={{
                                    color: isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.65)',
                                    textShadow: isActive ? '0 0 12px rgba(0, 240, 255, 0.4)' : 'none',
                                }}
                            >
                                {t(item.labelKey)}
                            </span>

                            {/* Active Indicator Bar */}
                            {isActive && (
                                <motion.div
                                    className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#00F0FF] ${isRTL ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'
                                        }`}
                                    style={{
                                        boxShadow: '0 0 12px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.5)',
                                    }}
                                    layoutId="sidebar-active-indicator"
                                    transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
