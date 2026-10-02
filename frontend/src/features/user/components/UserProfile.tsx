import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
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

    useEffect(() => {
        if (isDropdownOpen) {
            setDropdownPosition(getDropdownPosition());
        }

        const handleResize = () => {
            if (isDropdownOpen) setDropdownPosition(getDropdownPosition());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isDropdownOpen, isRTL]);

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
        e.stopPropagation();
        setIsDropdownOpen(false);
        logout();
        // Force reload to clear any other state
        setTimeout(() => window.location.href = '/', 100);
    };

    const handleNavigate = (tab: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDropdownOpen(false);
        onNavigate?.(tab);
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDropdownOpen(prev => !prev);
    };

    if (!user) return null;

    return (
        <>
            <button
                ref={buttonRef}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-full
                    transition-all duration-300
                    ${isDropdownOpen
                        ? 'bg-white/10 border border-white/20 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
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
                    className="mr-1"
                />
                <div className="hidden md:block text-right" style={{ pointerEvents: 'none' }}>
                    <div className="text-[11px] font-bold text-white leading-tight">{t(user?.fullName || '') || user?.fullName}</div>
                    <div className="text-[9px] text-white/60 leading-tight">@{user?.username}</div>
                </div>
                <ChevronDown
                    className={`w-3 h-3 text-white/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    style={{ pointerEvents: 'none' }}
                />
            </button>

            {isDropdownOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
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
                        transition={{ duration: 0.2 }}
                    >
                        <div style={{ position: 'relative' }}>
                            {/* Gradient Border */}
                            <div style={{
                                position: 'absolute',
                                inset: '-1px',
                                background: 'linear-gradient(90deg, #00F0FF, #00FF9D, #00F0FF)',
                                borderRadius: '16px',
                                opacity: 0.5,
                                filter: 'blur(4px)',
                                pointerEvents: 'none'
                            }} />

                            {/* Main Card - WITH SOLID BACKGROUND */}
                            <div style={{
                                position: 'relative',
                                background: 'rgba(10, 10, 10, 0.98)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
                                pointerEvents: 'auto'
                            }}>
                                {/* Header */}
                                <div style={{
                                    position: 'relative',
                                    padding: '20px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), transparent, rgba(0, 255, 157, 0.05))'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(90deg, #00F0FF, #00FF9D)',
                                                borderRadius: '50%',
                                                filter: 'blur(12px)',
                                                opacity: 0.5
                                            }} />
                                            <div style={{
                                                position: 'relative',
                                                padding: '4px',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                background: 'rgba(0, 0, 0, 0.3)'
                                            }}>
                                                <UserAvatar
                                                    alt={user?.fullName}
                                                    initials={user?.fullName?.slice(0, 2)}
                                                    status={user?.isOnline ? 'online' : 'offline'}
                                                    size="large"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', textAlign: 'center' }}>
                                                {t(user?.fullName || '') || user?.fullName}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                fontSize: '12px',
                                                fontFamily: 'monospace',
                                                justifyContent: 'center',
                                                marginTop: '4px'
                                            }}>
                                                <span>{t(user?.role || '') || user?.role}</span>
                                                <span>•</span>
                                                <span>Lvl {user?.clearanceLevel}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div style={{ padding: '8px' }}>
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

                                    <div style={{
                                        height: '1px',
                                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                                        margin: '8px 0'
                                    }} />

                                    <MenuItem
                                        icon={<LogOut className="w-4 h-4" />}
                                        label={t('logout') || 'خروج'}
                                        onClick={handleLogout}
                                        isRTL={isRTL}
                                        variant="danger"
                                    />
                                </div>

                                {/* Footer */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                    fontSize: '10px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontFamily: 'monospace' }}>v2.0.1</span>
                                    {user?.lastLogin && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${isDanger ? 'rgba(255, 46, 46, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                background: isDanger ? 'rgba(255, 46, 46, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                color: isDanger ? '#FF2E2E' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 300ms',
                transform: isHovered ? `scale(1.02) translateX(${isRTL ? -2 : 2}px)` : 'scale(1)',
                boxShadow: isHovered
                    ? isDanger ? '0 0 20px rgba(255, 46, 46, 0.2)' : '0 0 20px rgba(0, 240, 255, 0.15)'
                    : 'none',
                marginBottom: '4px'
            }}
            type="button"
        >
            <div style={{
                position: 'relative',
                zIndex: 10,
                transition: 'transform 300ms',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                color: isHovered && !isDanger ? '#00F0FF' : undefined
            }}>
                {icon}
            </div>

            <span style={{
                position: 'relative',
                zIndex: 10,
                fontSize: '14px',
                fontWeight: 500,
                flex: 1,
                color: isHovered && !isDanger ? '#00F0FF' : undefined
            }}>
                {label}
            </span>

            {isHovered && (
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isDanger ? '#FF2E2E' : '#00F0FF',
                    boxShadow: isDanger ? '0 0 8px #FF2E2E' : '0 0 8px #00F0FF'
                }} />
            )}
        </button>
    );
}
