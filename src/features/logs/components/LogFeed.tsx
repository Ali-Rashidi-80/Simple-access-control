export function LogFeed({ logs, compact = false }: LogFeedProps) {
    const { t, isRTL } = useLanguage();

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-[#00FF9D]" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-[#FF2E2E]" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-[#FFB800]" />;
            default:
                return <CheckCircle className="w-5 h-5 text-[#00FF9D]" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return '#00FF9D';
            case 'error':
                return '#FF2E2E';
            case 'pending':
                return '#FFB800';
            default:
                return '#00F0FF';
        }
    };

    return (
        <div className={`space-y-3 ${compact ? '' : 'max-h-[600px] overflow-y-auto pr-2 scrollbar-thin'}`}>
            <AnimatePresence mode="popLayout">
                {logs.map((log, index) => {
                    const statusColor = getStatusColor(log.status);

                    return (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: isRTL ? -50 : 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: isRTL ? 50 : -50, scale: 0.9 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 25,
                                delay: index * 0.05,
                            }}
                            className="glass-card backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300 group relative overflow-hidden"
                            whileHover={{ scale: 1.01, x: isRTL ? -4 : 4 }}
                        >
                            {/* Glare Effect on Hover */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Status Color Bar */}
                            <motion.div
                                className="absolute top-0 bottom-0 w-1 rounded-full"
                                style={{
                                    [isRTL ? 'right' : 'left']: 0,
                                    backgroundColor: statusColor,
                                    boxShadow: `0 0 10px ${statusColor}`,
                                    [isRTL ? 'borderTopLeftRadius' : 'borderTopRightRadius']: '9999px',
                                    [isRTL ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: '9999px',
                                }}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.05 + 0.2 }}
                            />

                            <div className={`relative z-10 flex items-center gap-4 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                                {/* Icon */}
                                <motion.div
                                    className="flex-shrink-0"
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    {getStatusIcon(log.status)}
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="text-white/90 truncate">{log.user}</p>
                                            <p className="text-white/50 text-sm mt-0.5">{t(log.action)}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className="text-white/40 text-xs tracking-wider">{log.timestamp}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <motion.div
                                    className="flex-shrink-0 px-2 py-1 rounded-lg backdrop-blur-sm text-xs tracking-wide"
                                    style={{
                                        backgroundColor: `${statusColor}15`,
                                        color: statusColor,
                                        border: `1px solid ${statusColor}30`,
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {t(log.status)}
                                </motion.div>
                            </div>

                            {/* Animated Accent */}
                            <motion.div
                                className="absolute -top-10 w-32 h-32 rounded-full blur-3xl opacity-10"
                                style={{
                                    [isRTL ? 'left' : 'right']: -40,
                                    backgroundColor: statusColor,
                                }}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.1, 0.15, 0.1],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: index * 0.2,
                                }}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}