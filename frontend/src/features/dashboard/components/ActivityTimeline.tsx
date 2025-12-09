import { motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

import { Activity } from '../types';

interface ActivityTimelineProps {
    activities: Activity[];
    maxItems?: number;
}

export function ActivityTimeline({ activities, maxItems = 5 }: ActivityTimelineProps) {
    const { t } = useLanguage();

    const getIcon = (type: Activity['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="w-5 h-5" />;
            case 'error':
                return <XCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5" />;
            case 'pending':
                return <Clock className="w-5 h-5" />;
        }
    };

    const getColor = (type: Activity['type']) => {
        switch (type) {
            case 'success':
                return '#00FF9D';
            case 'error':
                return '#FF2E2E';
            case 'warning':
                return '#FFB800';
            case 'pending':
                return '#00F0FF';
        }
    };

    const displayActivities = activities.slice(0, maxItems);

    return (
        <div className="glass-card backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#00F0FF] tracking-wide text-sm md:text-base font-medium">
                    {t('recentActivity') || 'فعالیت های اخیر'}
                </h3>
                <span className="text-white/40 text-xs">
                    {t('last24Hours') || '۲۴ ساعت گذشته'}
                </span>
            </div>

            <div className="space-y-2.5">
                {displayActivities.map((activity, index) => (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                            duration: 0.3,
                            delay: index * 0.1,
                            ease: 'easeOut',
                        }}
                        className="group relative"
                    >
                        {/* Connection Line */}
                        {index < displayActivities.length - 1 && (
                            <div
                                className="absolute top-9 w-px h-full opacity-20"
                                style={{
                                    background: getColor(activity.type),
                                    marginInlineStart: '13px',
                                }}
                            />
                        )}

                        <div className="flex items-start gap-3 relative">
                            {/* Icon */}
                            <motion.div
                                className="relative z-10 p-1.5 rounded-xl backdrop-blur-sm flex-shrink-0"
                                style={{
                                    backgroundColor: `${getColor(activity.type)}15`,
                                    boxShadow: `0 0 20px ${getColor(activity.type)}20`,
                                }}
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                                <div style={{ color: getColor(activity.type) }}>
                                    {getIcon(activity.type)}
                                </div>

                                {/* Pulse Effect */}
                                {activity.type === 'pending' && (
                                    <motion.div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            backgroundColor: getColor(activity.type),
                                        }}
                                        animate={{
                                            opacity: [0.3, 0, 0.3],
                                            scale: [1, 1.2, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                    />
                                )}
                            </motion.div>

                            {/* Content */}
                            <div className="flex-1 pt-0.5 min-w-0">
                                <p className="text-white/90 text-sm leading-relaxed group-hover:text-white transition-colors truncate">
                                    {activity.message}
                                </p>
                                <p className="text-white/40 text-xs mt-1">{activity.timestamp}</p>
                            </div>

                            {/* Hover Glow */}
                            <div
                                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
                                style={{
                                    background: `radial-gradient(circle at 10% 50%, ${getColor(activity.type)}10 0%, transparent 70%)`,
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    );
}
