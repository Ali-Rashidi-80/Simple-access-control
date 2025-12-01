import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserAvatar } from './UserAvatar';
import { Tooltip } from './Tooltip';
import { LogOut, Settings, User, Shield, Clock } from 'lucide-react';

export function UserProfile() {
    const { user, logout } = useAuth();
    const { t, isRTL } = useLanguage();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatLastLogin = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* User Avatar Button */}
            <Tooltip content={user?.fullName || user?.username || ''}>
                <motion.div
                    className="cursor-pointer"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <UserAvatar
                        alt={user?.fullName}
                        initials={user?.fullName?.slice(0, 2)}
                        status={user?.isOnline ? 'online' : 'offline'}
                        size="medium"
                    />
                </motion.div>
            </Tooltip>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 z-50`}
                        style={{ minWidth: '280px' }}
                    >
                        <div className="glass-card backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {/* User Info Header */}
                            <div className="p-4 border-b border-white/10 bg-gradient-to-br from-[#00F0FF]/10 to-[#00FF9D]/10">
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        alt={user?.fullName}
                                        initials={user?.fullName?.slice(0, 2)}
                                        status={user?.isOnline ? 'online' : 'offline'}
                                        size="large"
                                    />
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{user?.fullName}</div>
                                        <div className="text-white/60 text-sm">@{user?.username}</div>
                                    </div>
                                </div>

                                {/* User Details */}
                                <div className="mt-3 space-y-1 text-xs">
                                    <div className="flex items-center gap-2 text-white/70">
                                        <Shield className="w-3 h-3 text-[#00FF9D]" />
                                        <span>{t('role') || 'نقش'}: {user?.role}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/70">
                                        <Shield className="w-3 h-3 text-[#00F0FF]" />
                                        <span>{t('clearanceLevel') || 'سطح دسترسی'}: {user?.clearanceLevel}</span>
                                    </div>
                                    {user?.lastLogin && (
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Clock className="w-3 h-3 text-[#00FF9D]" />
                                            <span>{t('lastLogin') || 'آخرین ورود'}: {formatLastLogin(user.lastLogin)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="p-2">
                                <motion.button
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/5 transition-colors duration-200"
                                    whileHover={{ x: isRTL ? -3 : 3 }}
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        // Navigate to profile settings
                                    }}
                                >
                                    <User className="w-4 h-4" />
                                    <span>{t('profileSettings') || 'تنظیمات پروفایل'}</span>
                                </motion.button>

                                <motion.button
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/5 transition-colors duration-200"
                                    whileHover={{ x: isRTL ? -3 : 3 }}
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        // Navigate to system settings
                                    }}
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>{t('settings') || 'تنظیمات'}</span>
                                </motion.button>

                                <div className="my-2 border-t border-white/10" />

                                <motion.button
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#FF2E2E]/90 hover:bg-[#FF2E2E]/10 transition-colors duration-200"
                                    whileHover={{ x: isRTL ? -3 : 3 }}
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        logout();
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>{t('logout') || 'خروج'}</span>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
