import { motion } from 'motion/react';
import { useAppSettings } from '../../settings/contexts/AppSettingsContext';

interface UserAvatarProps {
    src?: string;
    alt?: string;
    size?: 'small' | 'medium' | 'large';
    status?: 'online' | 'offline' | 'busy';
    initials?: string;
    onClick?: () => void;
    className?: string;
}

export function UserAvatar({ src, alt, size = 'medium', status, initials, onClick, className = '' }: UserAvatarProps) {
    const { theme } = useAppSettings();

    const sizes = {
        small: 'w-8 h-8',
        medium: 'w-10 h-10',
        large: 'w-16 h-16',
    };

    const textSizes = {
        small: 'text-xs',
        medium: 'text-sm',
        large: 'text-lg',
    };

    const statusColors = {
        online: '#00FF9D',
        offline: '#64748b',
        busy: '#FF2E2E',
    };

    // Theme-aware text color for initials
    const getInitialsTextColor = () => {
        if (theme === 'matrix') {
            return '#000000'; // Black for Matrix theme for better readability
        }
        return '#050505'; // Dark color for other themes
    };

    const getInitials = () => {
        if (initials) return initials;
        if (alt) {
            return alt
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return 'U';
    };

    return (
        <motion.div
            className={`relative ${sizes[size]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
            whileHover={onClick ? { scale: 1.05 } : {}}
            whileTap={onClick ? { scale: 0.95 } : {}}
            onClick={onClick}
        >
            <div
                className={`${sizes[size]} rounded-full overflow-hidden bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center`}
                style={{
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                }}
            >
                {src ? (
                    <img src={src} alt={alt} className="w-full h-full object-cover" />
                ) : (
                    <div
                        className={`${textSizes[size]} font-bold`}
                        style={{ color: getInitialsTextColor() }}
                    >
                        {getInitials()}
                    </div>
                )}
            </div>

            {/* Status Indicator */}
            {status && (
                <motion.div
                    className="absolute bottom-0 right-0 rounded-full border-2 border-[#050505]"
                    style={{
                        width: size === 'large' ? '16px' : size === 'medium' ? '12px' : '8px',
                        height: size === 'large' ? '16px' : size === 'medium' ? '12px' : '8px',
                        backgroundColor: statusColors[status],
                    }}
                    animate={{
                        boxShadow: status === 'online'
                            ? ['0 0 4px ' + statusColors[status], '0 0 8px ' + statusColors[status], '0 0 4px ' + statusColors[status]]
                            : undefined,
                    }}
                    transition={{
                        duration: 2,
                        repeat: status === 'online' ? Infinity : 0,
                        ease: 'easeInOut',
                    }}
                />
            )}
        </motion.div>
    );
}
