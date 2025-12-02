import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, MapPin, Smartphone, X, SortDesc, Search, RefreshCw, Activity, AlertTriangle } from 'lucide-react';
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

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter(l => l.status === 'success').length;
    const errors = logs.filter(l => l.status === 'error').length;
    const pending = logs.filter(l => l.status === 'pending').length;
    const duress = logs.filter(l => l.isDuress).length;
    return { total, success, errors, pending, duress };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (searchQuery) {
      result = result.filter(log =>
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter(log => log.status === filterStatus);
    }

    result.sort((a, b) => sortBy === 'newest' ? b.id - a.id : a.id - b.id);
    return result;
  }, [logs, filterStatus, sortBy, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return theme === 'matrix' ? '#00FF00' : '#00FF9D';
      case 'error': return '#FF2E2E';
      case 'pending': return '#FFB800';
      default: return theme === 'matrix' ? '#00FF00' : '#00F0FF';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = theme === 'matrix'
      ? ['#00FF00', '#00DD00', '#00BB00', '#009900']
      : ['#00F0FF', '#00FF9D', '#a855f7', '#FFB800'];
    return colors[name.length % colors.length];
  };

  const primaryColor = theme === 'matrix' ? '#00FF00' : '#00F0FF';

  return (
    <div className="space-y-4 overflow-x-hidden pb-24">
      {/* Grid Statistics - Fixed Layout */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { key: 'total', label: t('total') || 'total', value: stats.total, icon: Activity, color: primaryColor },
            { key: 'success', label: t('success') || 'موفق', value: stats.success, icon: CheckCircle, color: '#00FF9D' },
            { key: 'error', label: t('error') || 'خطا', value: stats.errors, icon: XCircle, color: '#FF2E2E' },
            { key: 'pending', label: t('pending') || 'در انتظار', value: stats.pending, icon: Clock, color: '#FFB800' },
            { key: 'duress', label: t('duress') || 'duress', value: stats.duress, icon: AlertTriangle, color: '#FF2E2E' },
          ].map((stat) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 md:gap-3 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 border border-white/5"
              style={{
                background: theme === 'matrix'
                  ? 'rgba(0, 15, 0, 0.3)'
                  : 'rgba(10, 10, 20, 0.3)',
              }}
            >
              <div
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}30`,
                }}
              >
                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: stat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-wider mb-0.5 truncate">{stat.label}</p>
                <p className="text-lg md:text-xl font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Fixed Search Field - Proper Spacing */}
      {!compact && (
        <div className="relative">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10"
            style={{
              [isRTL ? 'right' : 'left']: '16px',
              color: 'rgba(255,255,255,0.3)',
            }}
          />
          <input
            type="text"
            placeholder="searchLogs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-black/20 border border-white/10 rounded-2xl ${isRTL ? 'pr-14 pl-12' : 'pl-14 pr-12'} py-3.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-black/30 transition-all`}
            style={{
              fontFamily: 'monospace',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ [isRTL ? 'left' : 'right']: '14px' }}
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
        </div>
      )}

      {/* Counter + Filters Row */}
      {!compact && (
        <div className="flex items-center gap-3">
          {/* Smart Counter */}
          <div className="flex items-center gap-2 text-sm flex-shrink-0">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="font-bold" style={{ color: primaryColor }}>
              {filteredLogs.length}
            </span>
            <span className="text-white/20">/</span>
            <span className="text-white/40">{logs.length}</span>
          </div>

          {/* Pill Filters - Scrollable */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {(['all', 'success', 'error', 'pending'] as const).map((status) => {
              const isActive = filterStatus === status;
              const colors = {
                all: primaryColor,
                success: '#00FF9D',
                error: '#FF2E2E',
                pending: '#FFB800',
              };
              const labels = {
                all: t('all') || 'all',
                success: t('success') || 'success',
                error: t('error') || 'error',
                pending: t('pending') || 'pending',
              };

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className="px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                  style={{
                    background: isActive ? colors[status] : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#000' : 'rgba(255, 255, 255, 0.4)',
                    border: `1px solid ${isActive ? colors[status] : 'rgba(255, 255, 255, 0.1)'}`,
                  }}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>

          {/* Icon Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-black/20 hover:bg-black/30 transition-all"
              title={sortBy === 'newest' ? 'Oldest First' : 'Newest First'}
            >
              <SortDesc className={`w-4 h-4 text-white/50 transition-transform ${sortBy === 'oldest' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setSortBy('newest');
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-black/20 hover:bg-black/30 transition-all"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      )}

      {/* Minimal Clean Cards with Bottom Padding */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3 ${compact ? '' : 'max-h-[550px] overflow-y-auto pr-1 custom-scrollbar'}`}>
        <AnimatePresence mode="sync">
          {filteredLogs.map((log) => {
            const statusColor = getStatusColor(log.status);
            const avatarColor = getAvatarColor(log.user);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                onClick={() => setSelectedLog(log)}
                className="group cursor-pointer"
              >
                <div
                  className="relative rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all"
                  style={{
                    background: theme === 'matrix'
                      ? 'linear-gradient(135deg, rgba(0, 20, 0, 0.2), rgba(0, 10, 0, 0.4))'
                      : 'linear-gradient(135deg, rgba(10, 10, 20, 0.2), rgba(5, 5, 15, 0.4))',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${avatarColor}DD, ${avatarColor})`,
                        }}
                      >
                        {log.avatar ? (
                          <img src={log.avatar} alt={log.user} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>{log.user.charAt(0)}</span>
                        )}
                      </div>

                      {/* Status Dot */}
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          backgroundColor: statusColor,
                          borderColor: theme === 'matrix' ? '#000' : '#0a0a14',
                        }}
                      >
                        {log.status === 'success' && <CheckCircle className="w-2.5 h-2.5" />}
                        {log.status === 'error' && <XCircle className="w-2.5 h-2.5" />}
                        {log.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-white truncate">
                          {log.user}
                        </h4>
                        {/* Duress Badge - Better Position */}
                        {log.isDuress && (
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md flex-shrink-0"
                            style={{
                              background: 'rgba(255, 46, 46, 0.2)',
                              border: '1px solid rgba(255, 46, 46, 0.4)',
                            }}
                          >
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-[9px] font-bold text-red-400">duress</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs mb-1 truncate" style={{ color: statusColor }}>
                        {t(log.action)}
                      </p>
                      <p className="text-[10px] font-mono text-white/30">
                        {log.timestamp}
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-[11px] text-white/40">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{log.location || 'اتاق سرور V-B آلفا ۷'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Smartphone className="w-3 h-3" />
                      <span className="truncate">{log.device || 'Web App'}</span>
                    </div>
                  </div>

                  {/* Subtle Bottom Accent */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl opacity-50"
                    style={{
                      background: `linear-gradient(90deg, ${statusColor}, transparent)`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Minimal Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative rounded-3xl border border-white/10 p-6"
                style={{
                  background: theme === 'matrix'
                    ? 'linear-gradient(135deg, rgba(0, 25, 0, 0.95), rgba(0, 15, 0, 0.98))'
                    : 'linear-gradient(135deg, rgba(15, 15, 30, 0.95), rgba(10, 10, 20, 0.98))',
                  backdropFilter: 'blur(40px)',
                }}
              >
                <button
                  className="absolute top-5 w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-all"
                  style={{ [isRTL ? 'left' : 'right']: 20 }}
                  onClick={() => setSelectedLog(null)}
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>

                <div className="flex justify-center mb-5">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${getAvatarColor(selectedLog.user)}, ${getAvatarColor(selectedLog.user)}DD)`,
                    }}
                  >
                    {selectedLog.avatar ? (
                      <img src={selectedLog.avatar} alt={selectedLog.user} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span>{selectedLog.user.charAt(0)}</span>
                    )}
                  </div>
                </div>

                <h3 className="text-center text-xl font-bold text-white mb-1">{selectedLog.user}</h3>
                <p className="text-center text-sm mb-6" style={{ color: getStatusColor(selectedLog.status) }}>
                  {t(selectedLog.action)}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <Clock className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
                    <div className="flex-1">
                      <p className="text-[10px] text-white/30 mb-0.5">{t('timestamp') || 'زمان'}</p>
                      <p className="text-sm text-white font-medium">{selectedLog.timestamp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF9D' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/30 mb-0.5">{t('location') || 'مکان'}</p>
                      <p className="text-sm text-white font-medium truncate">{selectedLog.location || 'اتاق سرور V-B آلفا ۷'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <Smartphone className="w-5 h-5 flex-shrink-0" style={{ color: '#a855f7' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/30 mb-0.5">{t('device') || 'دستگاه'}</p>
                      <p className="text-sm text-white font-medium truncate">{selectedLog.device || 'Web App'}</p>
                    </div>
                  </div>

                  {selectedLog.isDuress && (
                    <div
                      className="p-4 rounded-xl border"
                      style={{
                        background: 'rgba(255, 46, 46, 0.1)',
                        borderColor: 'rgba(255, 46, 46, 0.3)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-sm font-bold text-red-400">
                          {t('duressAlert') || 'هشدار ورود اجباری'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
