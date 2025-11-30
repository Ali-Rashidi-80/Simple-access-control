import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, User, MapPin, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Log {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  avatar?: string;
  location?: string;
  device?: string;
  isDuress?: boolean;
}

interface LogFeedInteractiveProps {
  logs: Log[];
  compact?: boolean;
}

export function LogFeedInteractive({ logs, compact = false }: LogFeedInteractiveProps) {
  const { t, isRTL } = useLanguage();
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

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

  const getAvatarColor = (name: string) => {
    const colors = ['#00F0FF', '#00FF9D', '#a855f7', '#FFB800', '#FF2E2E'];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <>
      <div className={`space-y-3 ${compact ? '' : 'max-h-[600px] overflow-y-auto pr-2 scrollbar-thin'}`}>
        <AnimatePresence mode="popLayout">
          {logs.map((log, index) => {
            const statusColor = getStatusColor(log.status);
            const avatarColor = getAvatarColor(log.user);

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
                className="glass-card backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300 group relative overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.01, x: isRTL ? -4 : 4 }}
                onClick={() => setSelectedLog(log)}
              >
                {/* Duress Alert Badge */}
                {log.isDuress && (
                  <motion.div
                    className="absolute top-2 px-2 py-1 rounded-lg backdrop-blur-sm text-xs flex items-center gap-1"
                    style={{
                      [isRTL ? 'left' : 'right']: 8,
                      backgroundColor: 'rgba(255, 46, 46, 0.2)',
                      border: '1px solid rgba(255, 46, 46, 0.3)',
                      color: '#FF2E2E',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ⚠️ {t('duressAlert')}
                  </motion.div>
                )}

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
                  {/* Avatar */}
                  <motion.div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColor}80 100%)`,
                      boxShadow: `0 0 20px ${avatarColor}40`,
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {log.avatar ? (
                      <img src={log.avatar} alt={log.user} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{log.user.charAt(0)}</span>
                    )}
                    
                    {/* Status Badge on Avatar */}
                    <div 
                      className="absolute bottom-0 w-3 h-3 rounded-full border-2 border-[#050505]"
                      style={{
                        [isRTL ? 'left' : 'right']: 0,
                        backgroundColor: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`,
                      }}
                    />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white/90 truncate flex items-center gap-2">
                          {log.user}
                          {log.isDuress && <span className="text-xs">🚨</span>}
                        </p>
                        <p className="text-white/50 text-sm mt-0.5">{t(log.action)}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-white/40 text-xs tracking-wider">{log.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Icon */}
                  <motion.div
                    className="flex-shrink-0"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {getStatusIcon(log.status)}
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

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Close Button */}
              <motion.button
                className="absolute top-4 w-8 h-8 rounded-full glass-card border border-white/10 flex items-center justify-center hover:border-[#FF2E2E]/50 transition-colors"
                style={{
                  [isRTL ? 'left' : 'right']: 16,
                }}
                onClick={() => setSelectedLog(null)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-white/60" />
              </motion.button>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${getAvatarColor(selectedLog.user)} 0%, ${getAvatarColor(selectedLog.user)}80 100%)`,
                    boxShadow: `0 0 40px ${getAvatarColor(selectedLog.user)}60`,
                  }}
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {selectedLog.avatar ? (
                    <img src={selectedLog.avatar} alt={selectedLog.user} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{selectedLog.user.charAt(0)}</span>
                  )}
                </motion.div>
              </div>

              {/* User Info */}
              <h3 className="text-center text-xl text-white/90 mb-2">{selectedLog.user}</h3>
              <p className="text-center text-[#00F0FF] mb-6">{t(selectedLog.action)}</p>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl glass-card border border-white/5">
                  <Clock className="w-5 h-5 text-[#00F0FF]" />
                  <div className="flex-1">
                    <p className="text-white/50 text-xs">{t('timestamp')}</p>
                    <p className="text-white/90">{selectedLog.timestamp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl glass-card border border-white/5">
                  <MapPin className="w-5 h-5 text-[#00FF9D]" />
                  <div className="flex-1">
                    <p className="text-white/50 text-xs">{t('location')}</p>
                    <p className="text-white/90">{selectedLog.location || t('serverRoom')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl glass-card border border-white/5">
                  <Smartphone className="w-5 h-5 text-[#a855f7]" />
                  <div className="flex-1">
                    <p className="text-white/50 text-xs">{t('device')}</p>
                    <p className="text-white/90">{selectedLog.device || 'Mobile App'}</p>
                  </div>
                </div>

                {selectedLog.isDuress && (
                  <motion.div
                    className="p-4 rounded-xl border"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 46, 46, 0.2) 0%, rgba(255, 46, 46, 0.05) 100%)',
                      borderColor: 'rgba(255, 46, 46, 0.3)',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <p className="text-[#FF2E2E] flex items-center gap-2">
                      ⚠️ {t('duressAlertDetailed')}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
