import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thermometer, Activity, AlertTriangle, User, Fingerprint } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../auth/contexts/AuthContext';
import { LiquidUnlockButton } from '../auth/components/LiquidUnlockButton';
import { StatsCard } from './components/StatsCard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { t } = useLanguage();
    const { logs, isConnected, sendMessage, lastUnknownTag, lastGrantedAccess, clearGrantedAccess } = useWebSocket();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Auto-unlock state
    const [autoUnlockTriggered, setAutoUnlockTriggered] = useState(false);

    // Real ping measurement
    const [ping, setPing] = useState<number | null>(null);

    const measurePing = useCallback(async () => {
        if (!isConnected) {
            setPing(null);
            return;
        }
        const start = performance.now();
        try {
            await fetch('/api/ping', { method: 'HEAD', cache: 'no-cache' });
            const end = performance.now();
            setPing(Math.round(end - start));
        } catch {
            setPing(null);
        }
    }, [isConnected]);

    // Measure ping every 30 seconds
    useEffect(() => {
        measurePing();
        const interval = setInterval(measurePing, 30000);
        return () => clearInterval(interval);
    }, [measurePing]);

    const currentTemp = logs.length > 0 && logs[0].temperature !== null ? logs[0].temperature : '--';
    const currentPing = ping !== null ? ping : isConnected ? '~' : '--';

    // AUTO-UNLOCK: When registered user scans RFID and gets GRANTED
    // Only triggers visual animation on the button - NO command sent (door already opens from ESP32)
    useEffect(() => {
        if (lastGrantedAccess && !autoUnlockTriggered) {
            // Ignore manual overrides (Remote Admin) to prevent ghost presses
            if (lastGrantedAccess.user_name === 'Remote Admin') return;

            // Show auto-unlock notification with user name
            toast.success(
                <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-[#00FF9D]" />
                    <div>
                        <div className="font-bold text-[#00FF9D]">{t('accessGranted') || 'دسترسی مجاز'}</div>
                        <div className="text-sm text-white/70">{lastGrantedAccess.user_name}</div>
                    </div>
                </div>,
                { duration: 3000 }
            );

            // Trigger visual animation on unlock button (no command sent)
            setAutoUnlockTriggered(true);
        }
    }, [lastGrantedAccess, autoUnlockTriggered, t]);

    // Callback when external trigger animation completes
    const handleExternalTriggerComplete = useCallback(() => {
        clearGrantedAccess();
        setAutoUnlockTriggered(false);
    }, [clearGrantedAccess]);

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
            {/* Welcome Message */}
            {user && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 rounded-2xl backdrop-blur-xl border border-[#00F0FF]/20"
                    style={{
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, transparent 100%)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-[#00F0FF]" />
                            )}
                        </div>
                        <div>
                            <p className="text-white/90 text-sm">
                                {t('welcome') || 'خوش آمدید'}، <span className="text-[#00F0FF] font-medium">{user.fullName}</span> عزیز
                            </p>
                            <p className="text-white/40 text-xs">{user.role === 'admin' ? t('systemAdmin') || 'مدیر سیستم' : t('operator') || 'اپراتور'}</p>
                        </div>
                    </div>
                </motion.div>
            )}

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
                    <LiquidUnlockButton
                        onUnlock={handleUnlock}
                        externalTrigger={autoUnlockTriggered}
                        onExternalTriggerComplete={handleExternalTriggerComplete}
                    />
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
