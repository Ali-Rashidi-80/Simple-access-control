import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, User, MapPin, Smartphone, X, Filter, SortAsc, Search, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

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
  const { theme } = useAppSettings();
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(log =>
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(log => log.status === filterStatus);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.id - a.id;
      } else {
        return a.id - b.id;
      }
    });

    return result;
  }, [logs, filterStatus, sortBy, searchQuery]);

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
      {/* Premium Control Panel */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-5"
        >
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/20 via-[#00FF9D]/20 to-[#a855f7]/20 rounded-3xl"
            style={{
              background: theme === 'matrix'
                ? 'linear-gradient(90deg, rgba(0,255,0,0.2), rgba(0,255,0,0.1), rgba(0,255,0,0.2))'
                : undefined
            }}
          />

          <div className="relative glass-card backdrop-blur-2xl border border-white/20 rounded-3xl p-5 m-[1px]"
            style={{
              background: theme === 'matrix'
                ? 'linear-gradient(135deg, rgba(0, 20, 0, 0.6), rgba(0, 10, 0, 0.4))'
                : 'linear-gradient(135deg, rgba(10, 10, 10, 0.8), rgba(20, 20, 20, 0.6))',
            }}
          >
            {/* Title Bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#00F0FF] to-[#00FF9D]"
                style={{
                  background: theme === 'matrix' ? 'linear-gradient(to bottom, #00FF00, #00DD00)' : undefined
                }}
              />
              <h3 className="text-sm font-bold text-white/90 tracking-wide">
                {t('filterControls') || 'کنترل‌های فیلتر'}
              </h3>
              <div className="flex-1" />
              <motion.div
                className="text-xs text-white/40 font-mono"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {filteredLogs.length}/{logs.length}
              </motion.div>
            </div>

            <div className="space-y-4">
              {/* Search Input - Enhanced */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/10 to-[#00FF9D]/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: theme === 'matrix' ? 'linear-gradient(to right, rgba(0,255,0,0.1), rgba(0,200,0,0.1))' : undefined
                  }}
                />
                <div className="relative flex items-center">
                  <Search className={`absolute w-5 h-5 text-white/50 transition-colors group-focus-within:text-[#00F0FF]`}
                    style={{
                      [isRTL ? 'right' : 'left']: '16px',
                      color: theme === 'matrix' ? '#00FF00' : undefined
                    }}
                  />
                  <input
                    type="text"
                    placeholder={t('searchLogs') || 'جستجو در گزارش‌ها...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-black/20 border-2 border-white/10 rounded-2xl ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-3.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#00F0FF]/50 focus:bg-black/30 transition-all`}
                    style={{
                      fontFamily: isRTL ? 'Vazirmatn, sans-serif' : 'inherit',
                      borderColor: theme === 'matrix' && searchQuery ? 'rgba(0, 255, 0, 0.5)' : undefined,
                    }}
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2E2E]/20 to-[#FF2E2E]/10 border border-[#FF2E2E]/30 hover:from-[#FF2E2E]/30 hover:to-[#FF2E2E]/20 flex items-center justify-center transition-all group"
                      style={{ [isRTL ? 'left' : 'right']: '12px' }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-4 h-4 text-[#FF2E2E]" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/50 font-medium">{t('status') || 'وضعیت'}:</span>
                  {(['all', 'success', 'error', 'pending'] as const).map((status) => {
                    const isActive = filterStatus === status;
                    const colors = {
                      all: { bg: '#00F0FF', text: '#00F0FF' },
                      success: { bg: '#00FF9D', text: '#00FF9D' },
                      error: { bg: '#FF2E2E', text: '#FF2E2E' },
                      pending: { bg: '#FFB800', text: '#FFB800' },
                    };
                    const matrixColor = '#00FF00';

                    return (
                      <motion.button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className="relative px-4 py-2 rounded-xl text-xs font-bold transition-all overflow-hidden"
                        style={{
                          background: isActive
                            ? theme === 'matrix'
                              ? `linear-gradient(135deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.1))`
                              : `linear-gradient(135deg, ${colors[status].bg}20, ${colors[status].bg}10)`
                            : 'rgba(255, 255, 255, 0.03)',
                          border: `2px solid ${isActive ? (theme === 'matrix' ? matrixColor : colors[status].bg) + '40' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isActive ? (theme === 'matrix' ? matrixColor : colors[status].text) : 'rgba(255, 255, 255, 0.6)',
                          boxShadow: isActive ? `0 0 20px ${theme === 'matrix' ? matrixColor : colors[status].bg}30` : 'none',
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              background: theme === 'matrix'
                                ? `radial-gradient(circle at center, ${matrixColor}15, transparent)`
                                : `radial-gradient(circle at center, ${colors[status].bg}15, transparent)`,
                            }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 0.2, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        <span className="relative z-10">
                          {status === 'all' ? (t('all') || 'همه') : t(status)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                {/* Sort Control - Enhanced */}
                <motion.button
                  onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                  style={{
                    color: theme === 'matrix' ? '#00FF00' : '#00F0FF',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SortAsc className={`w-4 h-4 transition-transform duration-300 ${sortBy === 'oldest' ? 'rotate-180' : ''}`} />
                  {sortBy === 'newest' ? (t('newest') || 'جدید→قدیم') : (t('oldest') || 'قدیم→جدید')}
                </motion.button>

                {/* Reset Button - Enhanced */}
                <motion.button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setSortBy('newest');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border-2 border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all ml-auto"
                  whileHover={{ scale: 1.05, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('reset') || 'بازنشانی'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className={`space-y-3 ${compact ? '' : 'max-h-[600px] overflow-y-auto pr-2 custom-scrollbar'}`}>
        <AnimatePresence mode="popLayout">
          {filteredLogs.map((log, index) => {
            const statusColor = getStatusColor(log.status);
            const avatarColor = getAvatarColor(log.user);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: index * 0.05,
                }}
                className="glass-card backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300 group relative overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedLog(log)}
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
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 truncate">{log.user}</p>
                        <p className="text-white/50 text-sm mt-0.5">{t(log.action)}</p>
                        {/* Duress Alert - Repositioned below user info */}
                        {log.isDuress && (
                          <motion.div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 max-w-fit"
                            style={{
                              backgroundColor: 'rgba(255, 46, 46, 0.15)',
                              border: '1px solid rgba(255, 46, 46, 0.4)',
                              color: '#FF2E2E',
                            }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <span>⚠️</span>
                            <span className="whitespace-nowrap">{t('duressAlert') || 'اجبار'}</span>
                          </motion.div>
                        )}
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
