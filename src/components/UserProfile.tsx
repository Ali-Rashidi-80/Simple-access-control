import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserAvatar } from './UserAvatar';
import { LogOut, Settings, User, Clock, ChevronDown } from 'lucide-react';

interface UserProfileProps {
    onNavigate?: (tab: string) => void;
}

export function UserProfile({ onNavigate }: UserProfileProps) {
    const { user, logout } = useAuth();
    const { t, isRTL } = useLanguage();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Calculate dropdown position
    const getDropdownPosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0, right: 0 };

        const rect = buttonRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + 8,
            left: isRTL ? rect.left : 'auto',
            right: isRTL ? 'auto' : window.innerWidth - rect.right
        };
    };

    const [dropdownPosition, setDropdownPosition] = useState(getDropdownPosition());

    // Update position when needed
    useEffect(() => {
        if (isDropdownOpen) {
            setDropdownPosition(getDropdownPosition());
        }

        const handleResize = () => {
            if (isDropdownOpen) {
                setDropdownPosition(getDropdownPosition());
            }
        };

        const handleScroll = () => {
            if (isDropdownOpen) {
                setDropdownPosition(getDropdownPosition());
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isDropdownOpen, isRTL]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setIsDropdownOpen(false);
            }
        };

        // Delay to prevent immediate closing
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside, true);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [isDropdownOpen]);

    const formatLastLogin = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Logout button clicked');
        setIsDropdownOpen(false);
        localStorage.removeItem('sentry_gate_user');
        setTimeout(() => {
            window.location.href = '/';
        }, 100);
    };

    const handleNavigate = (tab: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(false);
        onNavigate?.(tab);
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Button clicked, current state:', isDropdownOpen);
        setIsDropdownOpen(prev => !prev);
    };

    if (!user) {
        return null;
    }

    return (
        <>
            {/* User Avatar Button */}
            <button
                ref={buttonRef}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-full
                    transition-all duration-300
                    ${isDropdownOpen
                        ? 'bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    }
                `}
                onClick={handleButtonClick}
                style={{ cursor: 'pointer' }}
                type="button"
            >
                <UserAvatar
                    alt={user?.fullName}
                    initials={user?.fullName?.slice(0, 2)}
                    status={user?.isOnline ? 'online' : 'offline'}
                    size="medium"
                />
                <div className="hidden md:block text-right" style={{ pointerEvents: 'none' }}>
                    <div className="text-xs font-bold text-white leading-tight">{user?.fullName}</div>
                    <div className="text-[10px] text-white/60 leading-tight">@{user?.username}</div>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-white/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    style={{ pointerEvents: 'none' }}
                />
            </button>

            {/* Dropdown Menu - Rendered at document.body with maximum z-index */}
            {isDropdownOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed"
                    style={{
                        width: '280px',
                        top: `${dropdownPosition.top}px`,
                        left: dropdownPosition.left !== 'auto' ? `${dropdownPosition.left}px` : 'auto',
                        right: dropdownPosition.right !== 'auto' ? `${dropdownPosition.right}px` : 'auto',
                        zIndex: 999999,
                        pointerEvents: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {/* Glassmorphism Card */}
                        <div className="relative group">
                            {/* Animated Gradient Border */}
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-[#00F0FF] via-[#00FF9D] to-[#00F0FF] rounded-2xl opacity-50 blur-sm group-hover:opacity-75 transition-opacity duration-300"
                                style={{ pointerEvents: 'none' }} />

                            {/* Main Card */}
                            <div className="relative bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                                style={{ pointerEvents: 'auto' }}>

                                {/* Header Section */}
                                <div className="relative p-5 border-b border-white/5 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/10 via-transparent to-[#00FF9D]/10 opacity-50"
                                        style={{ pointerEvents: 'none' }} />

                                    <div className="relative z-10 flex flex-col items-center text-center gap-3">
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#00FF9D] rounded-full blur-md opacity-50"
                                                style={{ pointerEvents: 'none' }} />
                                            <div className="relative p-1 rounded-full border border-white/20 bg-black/30">
                                                <UserAvatar
                                                    alt={user?.fullName}
                                                    initials={user?.fullName?.slice(0, 2)}
                                                    status={user?.isOnline ? 'online' : 'offline'}
                                                    size="large"
                                                />
                                            </div>
                                        </div>

                                        {/* User Details */}
                                        <div className="space-y-1">
                                            <div className="text-white font-bold text-base">{user?.fullName}</div>
                                            <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
                                                <span>{user?.role}</span>
                                                <span>•</span>
                                                <span>Lvl {user?.clearanceLevel}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-2 space-y-1">
                                    <MenuItem
                                        icon={<User className="w-4 h-4" />}
                                        label={t('profileSettings') || 'تنظیمات پروفایل'}
                                        onClick={handleNavigate('profile')}
                                        isRTL={isRTL}
                                    />
                                    <MenuItem
                                        icon={<Settings className="w-4 h-4" />}
                                        label={t('settings') || 'تنظیمات'}
                                        onClick={handleNavigate('settings')}
                                        isRTL={isRTL}
                                    />

                                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

                                    <MenuItem
                                        icon={<LogOut className="w-4 h-4" />}
                                        label={t('logout') || 'خروج'}
                                        onClick={handleLogout}
                                        isRTL={isRTL}
                                        variant="danger"
                                    />
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 bg-black/30 border-t border-white/5 text-[10px] text-white/40 flex justify-between items-center">
                                    <span className="font-mono">v2.0.1</span>
                                    {user?.lastLogin && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatLastLogin(user.lastLogin)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </>
    );
}

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    isRTL: boolean;
    variant?: 'default' | 'danger';
}

function MenuItem({ icon, label, onClick, isRTL, variant = 'default' }: MenuItemProps) {
    const isDanger = variant === 'danger';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-300 relative overflow-hidden
                border
                ${isDanger
                    ? 'bg-[#FF2E2E]/5 border-[#FF2E2E]/20 text-[#FF2E2E] hover:bg-[#FF2E2E]/15 hover:border-[#FF2E2E]/40 hover:shadow-[0_0_20px_rgba(255,46,46,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-[#00F0FF]/30 hover:text-white hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                }
            `}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: isHovered ? `scale(1.02) translateX(${isRTL ? -2 : 2}px)` : 'scale(1) translateX(0)'
            }}
            type="button"
        >
            {/* Background Gradient */}
            <div className={`
                absolute inset-0 transition-opacity duration-300
                ${isDanger
                    ? 'bg-gradient-to-r from-[#FF2E2E]/0 via-[#FF2E2E]/10 to-[#FF2E2E]/0'
                    : 'bg-gradient-to-r from-[#00F0FF]/0 via-[#00F0FF]/10 to-[#00F0FF]/0'
                }
            `}
                style={{
                    opacity: isHovered ? 1 : 0,
                    pointerEvents: 'none'
                }} />

            {/* Icon */}
            <div className={`
                relative z-10 transition-all duration-300
                ${isDanger
                    ? 'text-[#FF2E2E]'
                    : 'text-white/60'
                }
            `}
                style={{
                    color: !isDanger && isHovered ? '#00F0FF' : undefined,
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    pointerEvents: 'none'
                }}>
                {icon}
            </div>

            {/* Label */}
            <span className={`
                relative z-10 text-sm font-medium transition-colors duration-300
            `}
                style={{
                    color: !isDanger && isHovered ? '#00F0FF' : undefined,
                    pointerEvents: 'none'
                }}>
                {label}
            </span>

            {/* Arrow Indicator */}
            <div
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} transition-all duration-300`}
                style={{
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered
                        ? 'translateX(0)'
                        : `translateX(${isRTL ? '8px' : '-8px'})`,
                    pointerEvents: 'none'
                }}
            >
                <div className={`
                    w-2 h-2 rounded-full
                    ${isDanger
                        ? 'bg-[#FF2E2E]'
                        : 'bg-[#00F0FF]'
                    }
                `}
                    style={{
                        boxShadow: isDanger
                            ? '0 0 8px #FF2E2E'
                            : '0 0 8px #00F0FF'
                    }} />
            </div>
        </button>
    );
}
