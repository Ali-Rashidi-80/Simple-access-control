import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  X,
  SortDesc,
  Search,
  RefreshCw,
  Activity,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showItemsDropdown, setShowItemsDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter(l => l.status === 'success').length;
    const errors = logs.filter(l => l.status === 'error').length;
    const pending = logs.filter(l => l.status === 'pending').length;
    const duress = logs.filter(l => l.isDuress).length;
    return { total, success, errors, pending, duress };
  }, [logs]);

  // Parse timestamp to Date object for comparison
  const parseLogTimestamp = useCallback((timestamp: string): Date => {
    // If timestamp is just time "HH:MM:SS", we might need the old logic, but generally backend sends ISO.
    // Let's support both: if it contains "T" or "-", assume ISO. Else assume Time-only (today).
    if (timestamp.includes('T') || timestamp.includes('-')) {
      return new Date(timestamp);
    }

    // Fallback for Time-only "HH:MM:SS" (legacy/mock support)
    const today = new Date();
    const parts = timestamp.split(':');
    if (parts.length >= 2) {
      const [hours, minutes, seconds] = parts.map(Number);
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds || 0);
    }
    return new Date(); // Fallback
  }, []);

  // Filter logs based on all criteria including date range
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.user.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.location?.toLowerCase().includes(query) ||
        log.device?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(log => log.status === filterStatus);
    }

    // Date range filter - connected to NeonDatePicker
    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter(log => {
        const logDate = parseLogTimestamp(log.timestamp);
        const logDateOnly = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());

        if (dateRange.startDate && dateRange.endDate) {
          const start = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
          const end = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
          return logDateOnly >= start && logDateOnly <= end;
        } else if (dateRange.startDate) {
          const start = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate());
          return logDateOnly >= start;
        } else if (dateRange.endDate) {
          const end = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate());
          return logDateOnly <= end;
        }
        return true;
      });
    }

    // Sort
    result.sort((a, b) => sortBy === 'newest' ? b.id - a.id : a.id - b.id);

    return result;
  }, [logs, filterStatus, sortBy, searchQuery, dateRange, parseLogTimestamp]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Reset pagination when filters change
  const handleFilterChange = (status: typeof filterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('newest');
    setDateRange({ startDate: null, endDate: null });
    setCurrentPage(1);
  };

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
  const secondaryColor = theme === 'matrix' ? '#00AA00' : '#00FF9D';

  // Format active date range for display
  const getDateRangeDisplay = () => {
    if (!dateRange.startDate && !dateRange.endDate) return null;

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date);
    };

    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    } else if (dateRange.startDate) {
      return `از ${formatDate(dateRange.startDate)}`;
    } else if (dateRange.endDate) {
      return `تا ${formatDate(dateRange.endDate)}`;
    }
    return null;
  };

  return (
    <div className="space-y-6 overflow-x-hidden pb-24" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: PREMIUM STATISTICS DASHBOARD
      ═══════════════════════════════════════════════════════════════════ */}
      {!compact && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `${primaryColor}15`,
                  border: `2px solid ${primaryColor}30`
                }}
              >
                <Activity className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('accessLogs') || 'گزارش دسترسی'}</h3>
                <p className="text-xs text-white/40">{t('realTimeMonitoring') || 'پایش لحظه‌ای'}</p>
              </div>
            </div>

            {/* Active Filters Badge */}
            {(filterStatus !== 'all' || dateRange.startDate || dateRange.endDate || searchQuery) && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: `${primaryColor}15`,
                  border: `1px solid ${primaryColor}30`,
                  color: primaryColor,
                }}
              >
                <Filter className="w-3 h-3" />
                <span>{t('activeFilters') || 'فیلتر فعال'}</span>
              </motion.div>
            )}
          </div>

          {/* Statistics Cards Grid - Brick-like responsive layout */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            }}
          >
            {[
              { key: 'total', label: t('total') || 'کل', value: stats.total, icon: Activity, color: primaryColor, percentage: 100 },
              { key: 'success', label: t('success') || 'موفق', value: stats.success, icon: CheckCircle, color: '#00FF9D', percentage: stats.total ? (stats.success / stats.total) * 100 : 0 },
              { key: 'error', label: t('error') || 'خطا', value: stats.errors, icon: XCircle, color: '#FF2E2E', percentage: stats.total ? (stats.errors / stats.total) * 100 : 0 },
              { key: 'pending', label: t('pending') || 'در انتظار', value: stats.pending, icon: Clock, color: '#FFB800', percentage: stats.total ? (stats.pending / stats.total) * 100 : 0 },
              { key: 'duress', label: t('duress') || 'اضطرار', value: stats.duress, icon: AlertTriangle, color: '#FF2E2E', percentage: stats.total ? (stats.duress / stats.total) * 100 : 0 },
            ].map((stat, index) => (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ scale: 1.05, y: -2 }}
                onHoverStart={() => setHoveredStat(stat.key)}
                onHoverEnd={() => setHoveredStat(null)}
                className="relative group cursor-pointer aspect-square"
              >
                <div
                  className="relative h-full overflow-hidden rounded-2xl border p-3 transition-all duration-300 flex flex-col"
                  style={{
                    background: theme === 'matrix'
                      ? 'linear-gradient(145deg, rgba(0, 20, 0, 0.7), rgba(0, 15, 0, 0.9))'
                      : 'linear-gradient(145deg, rgba(15, 15, 35, 0.7), rgba(10, 10, 30, 0.9))',
                    borderColor: hoveredStat === stat.key ? `${stat.color}60` : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: hoveredStat === stat.key ? `0 6px 24px ${stat.color}25, inset 0 0 20px ${stat.color}08` : 'none',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Background Glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${stat.color}18, transparent 65%)`,
                    }}
                  />

                  {/* Top Section: Icon */}
                  <div className="flex items-center justify-between mb-auto">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                      style={{
                        background: `${stat.color}18`,
                        border: `1.5px solid ${stat.color}35`,
                        boxShadow: `0 0 12px ${stat.color}12`,
                      }}
                    >
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>

                    {/* Percentage Badge */}
                    <div
                      className="px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{
                        background: `${stat.color}15`,
                        color: stat.color,
                        border: `1px solid ${stat.color}25`,
                      }}
                    >
                      {Math.round(stat.percentage)}%
                    </div>
                  </div>

                  {/* Center: Value */}
                  <div className="flex-1 flex items-center justify-center">
                    <motion.p
                      className="text-3xl font-extrabold leading-none"
                      style={{
                        color: stat.color,
                        textShadow: `0 0 25px ${stat.color}50`,
                      }}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.08 + 0.15, type: 'spring', stiffness: 200 }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>

                  {/* Bottom: Label */}
                  <p
                    className="text-[11px] text-white/55 font-semibold text-center truncate"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {stat.label}
                  </p>

                  {/* Bottom Accent Line */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[3px]"
                    style={{
                      background: `linear-gradient(90deg, transparent 5%, ${stat.color}80 50%, transparent 95%)`,
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                  />

                  {/* Corner Glow Effect */}
                  <div
                    className="absolute -top-3 -right-3 w-12 h-12 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-400 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${stat.color}40, transparent 70%)`,
                      filter: 'blur(8px)',
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: SMART CONTROL BAR
      ═══════════════════════════════════════════════════════════════════ */}
      {!compact && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {/* Main Control Row */}
          <div
            className="relative rounded-2xl border p-4"
            style={{
              background: theme === 'matrix'
                ? 'linear-gradient(135deg, rgba(0, 20, 0, 0.4), rgba(0, 10, 0, 0.6))'
                : 'linear-gradient(135deg, rgba(15, 15, 35, 0.4), rgba(10, 10, 30, 0.6))',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex flex-wrap items-center gap-3">

              {/* Expandable Search Icon/Input */}
              <div className={`relative ${searchExpanded ? 'flex-1 min-w-[200px] order-first w-full sm:w-auto sm:order-none' : ''}`}>
                <AnimatePresence mode="wait">
                  {!searchExpanded ? (
                    /* Search Icon Button - With Tooltip */
                    <div className="relative group">
                      <motion.button
                        key="search-icon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSearchExpanded(true)}
                        className="w-12 h-12 rounded-xl flex items-center justify-center border bg-black/20 hover:bg-black/30 transition-all"
                        style={{
                          borderColor: searchQuery ? primaryColor : 'rgba(255, 255, 255, 0.1)',
                          boxShadow: searchQuery ? `0 0 15px ${primaryColor}35` : 'none',
                        }}
                      >
                        <Search className="w-5 h-5" style={{ color: searchQuery ? primaryColor : 'rgba(255, 255, 255, 0.6)' }} />
                        {searchQuery && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full"
                            style={{ background: primaryColor }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          />
                        )}
                      </motion.button>

                      {/* Tooltip */}
                      <div
                        className={`absolute bottom-full mb-2 ${isRTL ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50`}
                      >
                        <div
                          className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{
                            background: theme === 'matrix' ? 'rgba(0, 30, 0, 0.95)' : 'rgba(15, 15, 35, 0.95)',
                            border: `1px solid ${primaryColor}40`,
                            color: 'rgba(255, 255, 255, 0.85)',
                            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3), 0 0 8px ${primaryColor}20`,
                          }}
                        >
                          {t('searchTooltip') || 'جستجو بر اساس نام، مکان یا دستگاه'}
                        </div>
                        {/* Tooltip Arrow */}
                        <div
                          className={`absolute top-full ${isRTL ? 'right-4' : 'left-4'} w-0 h-0`}
                          style={{
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `6px solid ${primaryColor}40`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Expanded Search Input - Full Width */
                    <motion.div
                      key="search-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative w-full"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('searchLogs') || 'جستجو...'}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => {
                          setSearchFocused(false);
                          if (!searchQuery) {
                            setSearchExpanded(false);
                          }
                        }}
                        className="w-full bg-black/30 border-2 rounded-xl py-3 px-4 text-sm text-white/90 placeholder-white/30 focus:outline-none transition-all text-center"
                        style={{
                          borderColor: searchFocused ? `${primaryColor}60` : 'rgba(255, 255, 255, 0.1)',
                          boxShadow: searchFocused ? `0 0 20px ${primaryColor}15` : 'none',
                        }}
                      />
                      {/* Close/Clear Button */}
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchExpanded(false);
                          setCurrentPage(1);
                        }}
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all ${isRTL ? 'left-2' : 'right-2'}`}
                      >
                        <X className="w-4 h-4 text-white/50 hover:text-white/80" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Separator */}
              <div className="hidden sm:block w-px h-8 bg-white/10" />

              {/* Date Picker with Connected Filtering */}
              <div className="relative z-50">
                <NeonDatePicker
                  onChange={handleDateRangeChange}
                  onReset={() => setDateRange({ startDate: null, endDate: null })}
                />
              </div>

              {/* Active Date Range Badge */}
              {getDateRangeDisplay() && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: `${secondaryColor}15`,
                    border: `1px solid ${secondaryColor}30`,
                    color: secondaryColor,
                  }}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{getDateRangeDisplay()}</span>
                  <button
                    onClick={() => setDateRange({ startDate: null, endDate: null })}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}

              {/* Separator */}
              <div className="hidden sm:block w-px h-8 bg-white/10" />

              {/* Items Per Page */}
              <div className="relative z-50" style={{ overflow: 'visible' }}>
                <button
                  onClick={() => setShowItemsDropdown(!showItemsDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-black/20 hover:bg-black/30 transition-all text-sm font-medium text-white/70"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <Eye className="w-4 h-4" />
                  <span>{itemsPerPage}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showItemsDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showItemsDropdown && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowItemsDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`absolute top-full mt-2 w-28 rounded-xl border overflow-hidden z-[100] ${isRTL ? 'right-0' : 'left-0'}`}
                        style={{
                          background: theme === 'matrix'
                            ? 'rgba(0, 25, 0, 0.98)'
                            : 'rgba(15, 15, 30, 0.98)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(20px)',
                        }}
                      >
                        {[5, 10, 20, 50].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setItemsPerPage(num);
                              setShowItemsDropdown(false);
                              setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-all text-center"
                            style={{
                              backgroundColor: itemsPerPage === num ? `${primaryColor}20` : 'transparent',
                              color: itemsPerPage === num ? primaryColor : undefined,
                            }}
                          >
                            {num} {t('items') || 'مورد'}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Results Counter */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="font-bold" style={{ color: primaryColor }}>{filteredLogs.length}</span>
                <span className="text-white/30">/</span>
                <span className="text-white/50">{logs.length}</span>
              </div>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filters */}
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
              const counts = {
                all: stats.total,
                success: stats.success,
                error: stats.errors,
                pending: stats.pending,
              };

              return (
                <motion.button
                  key={status}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFilterChange(status)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: isActive ? colors[status] : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#000' : 'rgba(255, 255, 255, 0.6)',
                    border: `2px solid ${isActive ? colors[status] : 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: isActive ? `0 0 24px ${colors[status]}40` : 'none',
                  }}
                >
                  <span>{labels[status]}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                    style={{
                      background: isActive ? 'rgba(0, 0, 0, 0.2)' : `${colors[status]}20`,
                      color: isActive ? 'inherit' : colors[status],
                    }}
                  >
                    {counts[status]}
                  </span>
                </motion.button>
              );
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                className="w-10 h-10 rounded-xl flex items-center justify-center border bg-black/20 hover:bg-black/30 transition-all"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                title={sortBy === 'newest' ? 'قدیمی‌ترین' : 'جدیدترین'}
              >
                <SortDesc className={`w-4 h-4 text-white/60 transition-transform ${sortBy === 'oldest' ? 'rotate-180' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="w-10 h-10 rounded-xl flex items-center justify-center border bg-black/20 hover:bg-black/30 transition-all"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                title={t('reset') || 'بازنشانی'}
              >
                <RefreshCw className="w-4 h-4 text-white/60" />
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: LOG CARDS GRID
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {/* Empty State */}
        {paginatedLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 rounded-2xl border"
            style={{
              background: theme === 'matrix'
                ? 'linear-gradient(135deg, rgba(0, 20, 0, 0.3), rgba(0, 10, 0, 0.5))'
                : 'linear-gradient(135deg, rgba(15, 15, 35, 0.3), rgba(10, 10, 30, 0.5))',
              borderColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${primaryColor}10` }}
            >
              <Search className="w-8 h-8" style={{ color: primaryColor, opacity: 0.5 }} />
            </div>
            <p className="text-white/50 text-sm mb-2">{t('noResults') || 'نتیجه‌ای یافت نشد'}</p>
            <button
              onClick={handleReset}
              className="text-xs px-4 py-2 rounded-lg transition-all"
              style={{ color: primaryColor, background: `${primaryColor}15` }}
            >
              {t('clearFilters') || 'پاک کردن فیلترها'}
            </button>
          </motion.div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 ${compact ? '' : 'max-h-[600px] overflow-y-auto custom-scrollbar pr-1'}`}>
              <AnimatePresence mode="popLayout">
                {paginatedLogs.map((log, index) => {
                  const statusColor = getStatusColor(log.status);
                  const avatarColor = getAvatarColor(log.user);

                  return (
                    <motion.article
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                        delay: index * 0.03,
                      }}
                      onClick={() => setSelectedLog(log)}
                      className="group cursor-pointer"
                    >
                      <div
                        className="relative rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:translate-y-[-4px]"
                        style={{
                          background: theme === 'matrix'
                            ? 'linear-gradient(145deg, rgba(0, 25, 0, 0.5), rgba(0, 15, 0, 0.7))'
                            : 'linear-gradient(145deg, rgba(15, 15, 35, 0.5), rgba(10, 10, 30, 0.7))',
                          borderColor: log.isDuress ? 'rgba(255, 46, 46, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(16px)',
                          boxShadow: log.isDuress
                            ? '0 8px 32px rgba(255, 46, 46, 0.15)'
                            : '0 4px 24px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        {/* Hover Glow Effect */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at 50% 0%, ${statusColor}15, transparent 60%)`,
                          }}
                        />

                        {/* Duress Banner */}
                        {log.isDuress && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="flex items-center justify-center gap-2 py-2 px-4"
                            style={{
                              background: 'linear-gradient(180deg, rgba(255, 46, 46, 0.25), rgba(255, 46, 46, 0.1))',
                              borderBottom: '1px solid rgba(255, 46, 46, 0.3)',
                            }}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                              {t('duress') || 'اضطرار'}
                            </span>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                          </motion.div>
                        )}

                        {/* Card Content */}
                        <div className="p-5">
                          {/* Header: Avatar + User Info */}
                          <div className="flex items-start gap-4 mb-4">
                            {/* Avatar Container */}
                            <div className="relative flex-shrink-0">
                              <motion.div
                                whileHover={{ scale: 1.08, rotate: 3 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                              >
                                {/* Status Ring Glow */}
                                <div
                                  className="absolute -inset-1.5 rounded-2xl opacity-60"
                                  style={{
                                    background: `conic-gradient(from 0deg, ${statusColor}, ${statusColor}40, ${statusColor})`,
                                    filter: 'blur(6px)',
                                  }}
                                />

                                {/* Avatar */}
                                <div
                                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                                  style={{
                                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}AA)`,
                                    border: `2px solid ${statusColor}`,
                                    boxShadow: `0 0 16px ${statusColor}30`,
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
                                  transition={{ delay: 0.15, type: 'spring' }}
                                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: statusColor,
                                    border: `2px solid ${theme === 'matrix' ? '#000' : '#0a0a14'}`,
                                    boxShadow: `0 0 12px ${statusColor}60`,
                                  }}
                                >
                                  {log.status === 'success' && <CheckCircle className="w-3.5 h-3.5 text-black" />}
                                  {log.status === 'error' && <XCircle className="w-3.5 h-3.5 text-black" />}
                                  {log.status === 'pending' && <Clock className="w-3.5 h-3.5 text-black" />}
                                </motion.div>
                              </motion.div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className="text-base font-bold text-white mb-1 truncate"
                                style={{ textShadow: `0 0 16px ${avatarColor}30` }}
                              >
                                {log.user}
                              </h4>
                              <p
                                className="text-sm font-medium truncate mb-2"
                                style={{ color: statusColor }}
                              >
                                {t(log.action)}
                              </p>

                              {/* Timestamp */}
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                                style={{
                                  background: `${primaryColor}10`,
                                  border: `1px solid ${primaryColor}25`,
                                }}
                              >
                                <Clock className="w-3 h-3" style={{ color: primaryColor }} />
                                <span className="text-xs font-mono" style={{ color: primaryColor }}>
                                  {log.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div
                            className="h-px mb-4"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${statusColor}30, transparent)`,
                            }}
                          />

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Location */}
                            <div
                              className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:scale-[1.02]"
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: `${statusColor}12`,
                                  border: `1px solid ${statusColor}25`,
                                }}
                              >
                                <MapPin className="w-3.5 h-3.5" style={{ color: statusColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[8px] uppercase tracking-wider text-white/35 font-medium">
                                  {t('location') || 'موقعیت'}
                                </p>
                                <p className="text-[11px] text-white/75 font-medium truncate">
                                  {log.location || t('unknown') || 'نامشخص'}
                                </p>
                              </div>
                            </div>

                            {/* Device */}
                            <div
                              className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:scale-[1.02]"
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: `${primaryColor}12`,
                                  border: `1px solid ${primaryColor}25`,
                                }}
                              >
                                <Smartphone className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[8px] uppercase tracking-wider text-white/35 font-medium">
                                  {t('device') || 'دستگاه'}
                                </p>
                                <p className="text-[11px] text-white/75 font-medium truncate">
                                  {log.device || t('web') || 'وب'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Accent */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${statusColor}80, transparent)`,
                          }}
                        />
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-6"
              >
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3),
                    Math.min(totalPages, currentPage + 2)
                  ).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all"
                      style={{
                        background: page === currentPage ? primaryColor : 'rgba(255, 255, 255, 0.05)',
                        color: page === currentPage ? '#000' : 'rgba(255, 255, 255, 0.6)',
                        boxShadow: page === currentPage ? `0 0 20px ${primaryColor}40` : 'none',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: DETAIL MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative rounded-3xl border-2 overflow-hidden"
                style={{
                  background: theme === 'matrix'
                    ? 'linear-gradient(145deg, rgba(0, 30, 0, 0.98), rgba(0, 20, 0, 0.99))'
                    : 'linear-gradient(145deg, rgba(15, 15, 35, 0.98), rgba(10, 10, 30, 0.99))',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                {/* Modal Header */}
                <div
                  className="relative p-6 pb-4"
                  style={{
                    background: `linear-gradient(180deg, ${getStatusColor(selectedLog.status)}10, transparent)`,
                  }}
                >
                  {/* Close Button */}
                  <motion.button
                    className={`absolute top-4 w-10 h-10 rounded-xl flex items-center justify-center border bg-black/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all ${isRTL ? 'left-4' : 'right-4'}`}
                    style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}
                    onClick={() => setSelectedLog(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4 text-white/60 hover:text-red-400 transition-colors" />
                  </motion.button>

                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${getAvatarColor(selectedLog.user)}, ${getAvatarColor(selectedLog.user)}CC)`,
                        boxShadow: `0 8px 32px ${getAvatarColor(selectedLog.user)}40`,
                      }}
                    >
                      {selectedLog.avatar ? (
                        <img src={selectedLog.avatar} alt={selectedLog.user} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{selectedLog.user.charAt(0)}</span>
                      )}
                    </div>
                  </div>

                  {/* User Name & Action */}
                  <h3 className="text-center text-xl font-bold text-white mb-1">{selectedLog.user}</h3>
                  <p className="text-center text-sm mb-2" style={{ color: getStatusColor(selectedLog.status) }}>
                    {t(selectedLog.action)}
                  </p>
                </div>

                {/* Modal Body */}
                <div className="px-6 pb-6 space-y-3">
                  {/* Time */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/8">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${primaryColor}15` }}
                    >
                      <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">{t('timestamp') || 'زمان'}</p>
                      <p className="text-sm text-white font-medium">{selectedLog.timestamp}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/8">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: '#00FF9D15' }}
                    >
                      <MapPin className="w-5 h-5" style={{ color: '#00FF9D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">{t('location') || 'موقعیت'}</p>
                      <p className="text-sm text-white font-medium truncate">{selectedLog.location || t('unknown') || 'نامشخص'}</p>
                    </div>
                  </div>

                  {/* Device */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/8">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: '#a855f715' }}
                    >
                      <Smartphone className="w-5 h-5" style={{ color: '#a855f7' }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">{t('device') || 'دستگاه'}</p>
                      <p className="text-sm text-white font-medium">{selectedLog.device || t('web') || 'وب'}</p>
                    </div>
                  </div>

                  {/* Duress Alert */}
                  {selectedLog.isDuress && (
                    <div
                      className="p-4 rounded-xl border-2"
                      style={{
                        background: 'rgba(255, 46, 46, 0.12)',
                        borderColor: 'rgba(255, 46, 46, 0.35)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />
                        <p className="text-sm font-bold text-red-400">
                          {t('duressAlert') || 'هشدار اضطراری فعال شده'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bottom Spacer */}
                  <div className="h-4" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primaryColor}40;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${primaryColor}60;
        }
      `}</style>
    </div>
  );
}
