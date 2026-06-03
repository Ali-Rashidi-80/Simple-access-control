import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thermometer, Activity, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { LiquidUnlockButton } from '../auth/components/LiquidUnlockButton';
import { StatsCard } from './components/StatsCard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { t } = useLanguage();
    const { logs, isConnected, sendMessage, lastUnknownTag, currentTemperature } = useWebSocket();
    const navigate = useNavigate();

    const currentTemp = currentTemperature !== null ? currentTemperature : (logs.length > 0 && logs[0].temperature !== null ? logs[0].temperature : '--');
    const currentPing = isConnected ? 12 : '--';

    useEffect(() => {
        if (lastUnknownTag) {
            toast.dismiss();
            toast(
                <div className="flex flex-col gap-2 w-full">
                    <div className="font-bold flex items-center gap-2 text-orange-400">
                        <Activity size={16} />
                        {t('unknown') || 'Unknown Tag'}
                    </div>
                    <div className="text-xs font-mono opacity-80">{lastUnknownTag.uid}</div>
                    <button
                        onClick={() => navigate(`/users?register=true&uid=${lastUnknownTag.uid}`)}
                        className="mt-1 bg-white/10 hover:bg-white/20 text-white text-xs py-1.5 px-3 rounded-lg border border-white/10 shadow-sm"
                    >
                        {t('registerNewCard') || 'Register'}
                    </button>
                </div>,
                { duration: 10000, position: 'top-center' }
            );
        }
    }, [lastUnknownTag, navigate, t]);

    const handleUnlock = () => {
        if (!isConnected) {
            toast.error(t('connectionLost') || 'Connection Lost');
            return;
        }
        sendMessage({ cmd: "OPEN" });
        toast.info(t('unlockCommandSent') || 'Order sent');
    };

    return (
        <div className="space-y-3 md:space-y-4">
            <AnimatePresence>
                {lastUnknownTag && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-orange-100">{t('unknown') || 'Unknown Card'}</div>
                                    <div className="text-xs font-mono text-orange-300/70">{lastUnknownTag.uid}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/users?register=true&uid=${lastUnknownTag.uid}`)}
                                className="px-4 py-2 bg-orange-500 text-black text-sm font-bold rounded-xl hover:bg-orange-400"
                            >
                                {t('register') || 'Register'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative">
                <motion.div
                    className="absolute inset-0 opacity-20 rounded-3xl overflow-hidden -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    transition={{ duration: 1 }}
                >
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, var(--liquid-primary)20 0%, transparent 70%)' }} />
                </motion.div>
                <div className="flex flex-col items-center justify-center py-3 md:py-4">
                    <LiquidUnlockButton onUnlock={handleUnlock} />
                </div>
            </div>

            <motion.div
                className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
                }}
            >
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatsCard
                        icon={<Thermometer className="w-6 h-6" />}
                        label={t('temperature')}
                        value={`${currentTemp}°C`}
                        status={(typeof currentTemp === 'number' && currentTemp > 35) ? 'warning' : 'normal'}
                        trend="stable"
                    />
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <StatsCard
                        icon={<Activity className="w-6 h-6" />}
                        label={t('ping')}
                        value={`${currentPing}ms`}
                        status={(typeof currentPing === 'number' && currentPing > 50) ? 'warning' : 'good'}
                        trend="up"
                    />
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
            >
                <ActivityTimeline
                    activities={logs.slice(0, 3).map((log) => ({
                        id: log.id,
                        type: log.action === 'GRANTED' ? 'success' : 'error',
                        message: `${log.user_name} - ${log.action} • ${log.temperature !== null ? log.temperature + '°C' : ''}`,
                        timestamp: new Date(log.timestamp).toLocaleTimeString(),
                    }))}
                    maxItems={3}
                />
            </motion.div>
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
        </div>
    );
}
