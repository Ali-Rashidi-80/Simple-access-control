import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, MapPin, Smartphone, X, SortDesc, Search, RefreshCw, Activity, AlertTriangle, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAppSettings } from '../../settings/contexts/AppSettingsContext';
import NeonDatePicker from '../../../components/Liquid-Neon-Persian-Picker-main/components/NeonDatePicker';
import { DateRange } from '../../../components/Liquid-Neon-Persian-Picker-main/components/NeonDatePicker/types';

import { Log } from '../types';

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
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showItemsDropdown, setShowItemsDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

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
    return result.slice(0, itemsPerPage);
  }, [logs, filterStatus, sortBy, searchQuery, itemsPerPage]);

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
      {/* Premium Unified Statistics Card */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10"
          style={{
            background: theme === 'matrix'
              ? 'linear-gradient(135deg, rgba(0, 25, 0, 0.5), rgba(0, 15, 0, 0.7))'
              : 'linear-gradient(135deg, rgba(15, 15, 35, 0.5), rgba(10, 10, 30, 0.7))',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Animated Background Glow */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at top left, ${primaryColor}10, transparent 50%)`,
            }}
          />

          <div className="relative px-6 py-4">
            {/* Horizontal Compact Layout for Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { key: 'total', label: t('total') || 'کل', value: stats.total, icon: Activity, color: primaryColor },
                { key: 'success', label: t('success') || 'موفق', value: stats.success, icon: CheckCircle, color: '#00FF9D' },
                { key: 'error', label: t('error') || 'خطا', value: stats.errors, icon: XCircle, color: '#FF2E2E' },
                { key: 'pending', label: t('pending') || 'در انتظار', value: stats.pending, icon: Clock, color: '#FFB800' },
                { key: 'duress', label: t('duress') || 'اضطرار', value: stats.duress, icon: AlertTriangle, color: '#FF2E2E' },
              ].map((stat, index) => (
                <div key={stat.key} className="relative">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group transition-all"
                    style={{
                      background: `${stat.color}08`,
                    }}
                  >
                    {/* Hover Glow */}
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at center, ${stat.color}15, transparent)`,
                        boxShadow: `0 0 20px ${stat.color}20`,
                      }}
                    />

                    {/* Icon Container */}
                    <div
                      className="relative w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{
                        background: `${stat.color}15`,
                        border: `2px solid ${stat.color}40`,
                        boxShadow: `0 0 15px ${stat.color}10`,
                      }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>

                    {/* Value & Label */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-2xl font-bold transition-all"
                        style={{
                          color: stat.color,
                          textShadow: `0 0 15px ${stat.color}30`,
                        }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wide font-medium truncate">
                        {stat.label}
                      </p>
                    </div>

                    {/* Right Accent */}
                    <div
                      className="absolute top-0 bottom-0 w-1 rounded-full transition-all"
                      style={{
                        [isRTL ? 'left' : 'right']: 0,
                        background: `linear-gradient(180deg, transparent, ${stat.color}, transparent)`,
                        opacity: 0.5,
                      }}
                    />
                  </motion.div>

                  {/* Divider Line - except for last item - hidden on mobile */}
                  {index < 4 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-px h-10 hidden xl:block"
                      style={{
                        [isRTL ? 'left' : 'right']: '-0.375rem',
                        background: `linear-gradient(180deg, transparent, ${primaryColor}25, transparent)`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Accent Line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}00, ${primaryColor}60, ${primaryColor}00)`,
            }}
          />
        </motion.div>
      )}

      {/* Smart Control Bar */}
      {!compact && (
        <div className="space-y-2">
          {/* First Row: Search + Items Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Expandable Search */}
            <div className="relative flex-1 min-w-[200px]">
              <AnimatePresence mode="wait">
                {searchExpanded ? (
                  <motion.div
                    key="expanded"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="relative"
                  >
                    <Search
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10"
                      style={{
                        [isRTL ? 'right' : 'left']: '16px',
                        color: primaryColor,
                      }}
                    />
                    <input
                      type="text"
                      placeholder={t('searchLogs') || 'جستجو...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className={`w-full bg-black/30 border-2 rounded-2xl py-3 text-sm text-white/80 placeholder-white/30 focus:outline-none transition-all ${isRTL ? 'pr-12 pl-11 text-right' : 'pl-12 pr-11 text-left'} ${!searchQuery ? 'placeholder:text-center' : ''}`}
                      style={{
                        borderColor: `${primaryColor}60`,
                        fontFamily: isRTL ? 'Vazirmatn, sans-serif' : 'inherit',
                        paddingInlineStart: searchQuery ? (isRTL ? '2.75rem' : '3rem') : '3rem',
                      }}
                    />
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchExpanded(false);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                      style={{ [isRTL ? 'left' : 'right']: '12px' }}
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="collapsed"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={() => setSearchExpanded(true)}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 border-white/10 bg-black/20 hover:bg-black/30 transition-all group"
                    style={{ borderColor: `${primaryColor}30` }}
                  >
                    <Search className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" style={{ color: primaryColor }} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Items Per Page Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowItemsDropdown(!showItemsDropdown)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-white/10 bg-black/20 hover:bg-black/30 transition-all text-sm font-medium text-white/70"
              >
                <span>{itemsPerPage} {t('items') || 'مورد'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showItemsDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showItemsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 right-0 w-32 rounded-xl border border-white/10 overflow-hidden z-20"
                    style={{
                      background: theme === 'matrix'
                        ? 'rgba(0, 25, 0, 0.95)'
                        : 'rgba(15, 15, 30, 0.95)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {[5, 10, 20, 50].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setItemsPerPage(num);
                          setShowItemsDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-all text-center"
                        style={{
                          backgroundColor: itemsPerPage === num ? `${primaryColor}20` : 'transparent',
                          color: itemsPerPage === num ? primaryColor : undefined,
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Counter */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-black/20 text-sm flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="font-bold" style={{ color: primaryColor }}>{filteredLogs.length}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{logs.length}</span>
            </div>

            {/* Date Picker */}
            <div className="relative z-50">
              <NeonDatePicker onChange={setDateRange} />
            </div>
          </div>

          {/* Second Row: Filters + Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pill Filters */}
            {(['all', 'success', 'error', 'pending'] as const).map((status) => {
              const isActive = filterStatus === status;
              const colors = {
                all: primaryColor,
                success: '#00FF9D',
                error: '#FF2E2E',
                pending: '#FFB800',
              };
              const labels = {
                all: t('all') || 'همه',
                success: t('success') || 'موفق',
                error: t('error') || 'خطا',
                pending: t('pending') || 'در انتظار',
              };

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: isActive ? colors[status] : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#000' : 'rgba(255, 255, 255, 0.5)',
                    border: `2px solid ${isActive ? colors[status] : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: isActive ? `0 0 20px ${colors[status]}40` : 'none',
                  }}
                >
                  {labels[status]}
                </button>
              );
            })}

            {/* Spacer */}
            <div className="flex-1 min-w-[20px]" />

            {/* Action Buttons */}
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 border-white/10 bg-black/20 hover:bg-black/30 transition-all"
              title={sortBy === 'newest' ? 'Oldest First' : 'Newest First'}
            >
              <SortDesc className={`w-5 h-5 text-white/50 transition-transform ${sortBy === 'oldest' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setSortBy('newest');
                setSearchExpanded(false);
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 border-white/10 bg-black/20 hover:bg-black/30 transition-all"
              title="Reset"
            >
              <RefreshCw className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>
      )}

      {/* Premium Redesigned Cards Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 ${compact ? '' : 'max-h-[520px] overflow-y-auto pr-1 custom-scrollbar'}`}>
        <AnimatePresence mode="sync">
          {filteredLogs.map((log, index) => {
            const statusColor = getStatusColor(log.status);
            const avatarColor = getAvatarColor(log.user);

            return (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  delay: index * 0.05
                }}
                onClick={() => setSelectedLog(log)}
                className="group cursor-pointer"
              >
                <div
                  className="relative rounded-3xl overflow-hidden border-2 hover:scale-[1.02] transition-all duration-300"
                  style={{
                    background: theme === 'matrix'
                      ? 'linear-gradient(135deg, rgba(0, 25, 0, 0.4), rgba(0, 15, 0, 0.6))'
                      : 'linear-gradient(135deg, rgba(15, 15, 30, 0.4), rgba(10, 10, 25, 0.6))',
                    borderColor: log.isDuress ? 'rgba(255, 46, 46, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: log.isDuress
                      ? '0 8px 32px rgba(255, 46, 46, 0.2)'
                      : `0 8px 32px ${statusColor}15`,
                  }}
                >
                  {/* Animated Background Glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle at top right, ${statusColor}20, transparent 70%)`,
                    }}
                  />

                  {/* Duress Alert Banner */}
                  {log.isDuress && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-0 left-0 right-0 px-4 py-2 flex items-center justify-center gap-2 z-10"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255, 46, 46, 0.3), transparent)',
                        borderBottom: '1px solid rgba(255, 46, 46, 0.4)',
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                        {t('duress') || 'اضطرار'}
                      </span>
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                    </motion.div>
                  )}

                  {/* Main Content */}
                  <div className={`relative p-5 ${log.isDuress ? 'pt-12' : ''}`}>
                    {/* Header Section with Avatar and Status */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Avatar with Status Ring */}
                      <div className="relative flex-shrink-0">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="relative"
                        >
                          {/* Status Ring */}
                          <div
                            className="absolute -inset-1.5 rounded-2xl"
                            style={{
                              background: `conic-gradient(from 0deg, ${statusColor}, ${statusColor}40, ${statusColor})`,
                              filter: 'blur(8px)',
                              opacity: 0.6,
                            }}
                          />

                          {/* Avatar */}
                          <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl border-3"
                            style={{
                              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
                              borderColor: statusColor,
                              boxShadow: `0 0 20px ${statusColor}30`,
                            }}
                          >
                            {log.avatar ? (
                              <img src={log.avatar} alt={log.user} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <span>{log.user.charAt(0)}</span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-3 flex items-center justify-center"
                            style={{
                              backgroundColor: statusColor,
                              borderColor: theme === 'matrix' ? '#000' : '#0a0a14',
                              boxShadow: `0 0 15px ${statusColor}60`,
                            }}
                          >
                            {log.status === 'success' && <CheckCircle className="w-4 h-4 text-black" />}
                            {log.status === 'error' && <XCircle className="w-4 h-4 text-black" />}
                            {log.status === 'pending' && <Clock className="w-4 h-4 text-black" />}
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0 pt-1">
                        <h4
                          className="text-base font-bold text-white mb-1 truncate"
                          style={{
                            textShadow: `0 0 20px ${avatarColor}40`,
                          }}
                        >
                          {log.user}
                        </h4>
                        <p
                          className="text-sm font-medium mb-2 truncate"
                          style={{
                            color: statusColor,
                            textShadow: `0 0 10px ${statusColor}30`,
                          }}
                        >
                          {t(log.action)}
                        </p>

                        {/* Time Badge */}
                        <div
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                          style={{
                            background: `${primaryColor}10`,
                            borderColor: `${primaryColor}30`,
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                          <span
                            className="text-xs font-mono font-medium"
                            style={{ color: primaryColor }}
                          >
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div
                      className="h-px mb-4"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${statusColor}40, transparent)`,
                      }}
                    />

                    {/* Details Section */}
                    <div className="space-y-2.5">
                      {/* Location */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all group/item hover:scale-[1.02]"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderColor: 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/item:scale-110"
                          style={{
                            background: `${statusColor}15`,
                            border: `1px solid ${statusColor}30`,
                          }}
                        >
                          <MapPin className="w-4 h-4" style={{ color: statusColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5 font-medium">
                            {t('location') || 'موقعیت'}
                          </p>
                          <p className="text-xs text-white/80 font-medium truncate">
                            {log.location || t('unknown') || 'نامشخص'}
                          </p>
                        </div>
                      </div>

                      {/* Device */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all group/item hover:scale-[1.02]"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderColor: 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/item:scale-110"
                          style={{
                            background: `${primaryColor}15`,
                            border: `1px solid ${primaryColor}30`,
                          }}
                        >
                          <Smartphone className="w-4 h-4" style={{ color: primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5 font-medium">
                            {t('device') || 'دستگاه'}
                          </p>
                          <p className="text-xs text-white/80 font-medium truncate">
                            {log.device || t('web') || 'وب'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Accent Bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
                    }}
                  />

                  {/* Corner Accents */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20 opacity-30 group-hover:opacity-50 transition-opacity"
                    style={{
                      background: `radial-gradient(circle at top right, ${statusColor}40, transparent)`,
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{
                      background: `radial-gradient(circle at bottom left, ${avatarColor}30, transparent)`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Enhanced Modal */}
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
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative rounded-3xl border-2 p-6"
                style={{
                  background: theme === 'matrix'
                    ? 'linear-gradient(135deg, rgba(0, 30, 0, 0.95), rgba(0, 20, 0, 0.98))'
                    : 'linear-gradient(135deg, rgba(15, 15, 30, 0.95), rgba(10, 10, 25, 0.98))',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                {/* Enhanced Close Button */}
                <motion.button
                  className="absolute top-4 w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white/20 hover:border-red-500/50 bg-black/30 hover:bg-red-500/20 transition-all group"
                  style={{ [isRTL ? 'left' : 'right']: 16 }}
                  onClick={() => setSelectedLog(null)}
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
                </motion.button>

                <div className="flex justify-center mb-5">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold"
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
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Clock className="w-6 h-6 flex-shrink-0" style={{ color: primaryColor }} />
                    <div>
                      <p className="text-[10px] text-white/30 mb-0.5">{t('timestamp') || 'زمان'}</p>
                      <p className="text-sm text-white font-medium">{selectedLog.timestamp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <MapPin className="w-6 h-6 flex-shrink-0" style={{ color: '#00FF9D' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/30 mb-0.5">{t('location') || 'موقعیت'}</p>
                      <p className="text-sm text-white font-medium truncate">{selectedLog.location || t('unknown') || 'نامشخص'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Smartphone className="w-6 h-6 flex-shrink-0" style={{ color: '#a855f7' }} />
                    <div>
                      <p className="text-[10px] text-white/30 mb-0.5">{t('device') || 'دستگاه'}</p>
                      <p className="text-sm text-white font-medium">{selectedLog.device || t('web') || 'وب'}</p>
                    </div>
                  </div>

                  {selectedLog.isDuress && (
                    <div
                      className="p-4 rounded-xl border-2"
                      style={{
                        background: 'rgba(255, 46, 46, 0.15)',
                        borderColor: 'rgba(255, 46, 46, 0.4)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <p className="text-sm font-bold text-red-400">
                          {t('duressAlert') || 'هشدار اضطرار'}
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
