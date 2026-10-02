
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import DesktopView from './DesktopView';
import MobileView from './MobileView';
import * as Jalali from './utils';
import { NeonDatePickerProps, ShortcutType, ViewMode } from './types';
import { styles, animations } from './styles';

const NeonDatePicker: React.FC<NeonDatePickerProps> = ({ onChange, onReset, className = '', defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  // Committed State (Trigger)
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Temporary State (Modal)
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activeShortcut, setActiveShortcut] = useState<ShortcutType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isMobile, setIsMobile] = useState(false);
  
  // Smart Trigger Hover State
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  
  // 1 = Slide Left (Next), -1 = Slide Right (Prev)
  const [direction, setDirection] = useState(0);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      if (startDate) setCurrentDate(startDate);
    }
  }, [isOpen, startDate, endDate]);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 5-Second Auto-Close Inactivity Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          setIsOpen(false);
        }, 5000);
      };

      // Listen for any interaction to reset the timer
      window.addEventListener('pointermove', resetTimer);
      window.addEventListener('mousedown', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('touchstart', resetTimer);

      // Start the timer immediately
      resetTimer();

      return () => {
        clearTimeout(timer);
        window.removeEventListener('pointermove', resetTimer);
        window.removeEventListener('mousedown', resetTimer);
        window.removeEventListener('keydown', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
      };
    }
  }, [isOpen]);

  const handleDateClick = (day: Date) => {
    setActiveShortcut(null);

    if (!tempStartDate) {
      setTempStartDate(day);
      setTempEndDate(null);
      return;
    }

    if (tempStartDate && !tempEndDate) {
      if (Jalali.isBefore(day, tempStartDate)) {
        setTempStartDate(day);
      } else {
        setTempEndDate(day);
      }
      return;
    }

    if (tempStartDate && tempEndDate) {
      if (Jalali.isBefore(day, tempStartDate)) {
        setTempStartDate(day);
        setTempEndDate(null);
      } else {
        setTempEndDate(day);
      }
    }
  };

  const handleDateHover = (day: Date) => {
    if (tempStartDate && !tempEndDate) {
      setHoverDate(day);
    }
  };

  // Resets the committed state (for the Trigger X button or external reset)
  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    setActiveShortcut(null);
    if (onChange) onChange({ startDate: null, endDate: null });
    if (onReset) onReset();
  };

  // Clears the temporary selection inside the modal
  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setActiveShortcut(null);
  };

  const handleShortcut = (type: ShortcutType) => {
    if (activeShortcut === type) {
      setActiveShortcut(null);
      setTempStartDate(null);
      setTempEndDate(null);
      return;
    }

    setActiveShortcut(type);
    const today = new Date();
    let newStart: Date | null = null;
    let newEnd: Date | null = null;

    switch (type) {
      case ShortcutType.TODAY:
        newStart = today;
        newEnd = today;
        break;
      case ShortcutType.YESTERDAY:
        newStart = Jalali.subDays(today, 1);
        newEnd = Jalali.subDays(today, 1);
        break;
      case ShortcutType.THIS_WEEK:
        newStart = Jalali.subDays(today, 6); 
        newEnd = today;
        break;
      case ShortcutType.LAST_MONTH:
        const lastMonth = Jalali.subMonths(today, 1);
        newStart = Jalali.startOfMonth(lastMonth);
        newEnd = Jalali.endOfMonth(lastMonth);
        break;
    }
    
    setTempStartDate(newStart);
    setTempEndDate(newEnd);
    
    // Always navigate calendar to the start of the selection
    if (newStart) {
      setCurrentDate(newStart);
    }
    
    setViewMode('calendar'); 
  };

  const handleConfirm = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    if (onChange) {
      onChange({ startDate: tempStartDate, endDate: tempEndDate });
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleMonthChange = (amount: number) => {
    setDirection(amount);
    setCurrentDate(prev => Jalali.addMonths(prev, amount));
  };

  const handleSelectYear = (year: number) => {
    setCurrentDate(prev => Jalali.setYear(prev, year));
  };

  const handleSelectMonth = (monthIndex: number) => {
    setCurrentDate(prev => Jalali.setMonth(prev, monthIndex));
    setViewMode('calendar');
  };

  const viewProps = {
    currentDate,
    startDate: tempStartDate,
    endDate: tempEndDate,
    hoverDate,
    activeShortcut,
    viewMode,
    direction,
    onDateClick: handleDateClick,
    onDateHover: handleDateHover,
    onShortcut: handleShortcut,
    onMonthChange: handleMonthChange,
    onViewModeChange: setViewMode,
    onSelectYear: handleSelectYear,
    onSelectMonth: handleSelectMonth,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    onReset: handleClear,
  };

  // Trigger Content Logic
  const hasDate = !!startDate;
  // Expand if hovered OR if a date is selected (persistent expansion)
  const shouldExpand = isTriggerHovered || hasDate;
  
  // Check if it's a single day selection (start == end)
  const isSingleDay = startDate && endDate && Jalali.isSameDay(startDate, endDate);
  
  return (
    <>
      <motion.button 
        type="button"
        layout
        initial={{ width: "4.5rem", borderRadius: "1rem" }} 
        animate={{ 
          width: shouldExpand ? "auto" : "4.5rem",
          borderRadius: "1rem",
          boxShadow: isTriggerHovered || hasDate ? "0 0 25px rgba(0,240,255,0.2)" : "0 0 15px rgba(0,0,0,0.3)",
          borderColor: hasDate ? "rgba(0, 240, 255, 0.5)" : "rgba(255, 255, 255, 0.1)"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onHoverStart={() => setIsTriggerHovered(true)}
        onHoverEnd={() => setIsTriggerHovered(false)}
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`${styles.triggerButton} ${className}`}
        style={{ minWidth: "4.5rem" }}
      >
        <div className="flex items-center justify-center h-full px-0">
            {/* Right Side: Day + Month (Always Visible Icon-like) */}
            <div className="w-[4.5rem] h-16 flex flex-col items-center justify-center flex-shrink-0 relative z-10">
                {hasDate ? (
                    <>
                        <span className="text-neon font-bold text-3xl leading-none font-mono tracking-tighter drop-shadow-[0_0_5px_rgba(0,240,255,0.8)] mb-0.5">
                            {Jalali.formatDate(startDate!, 'd')}
                        </span>
                        <span className="text-white/80 text-[10px] font-bold leading-none">
                            {Jalali.formatDate(startDate!, 'MMMM')}
                        </span>
                    </>
                ) : (
                    <CalendarIcon className="w-7 h-7 text-neon drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]" />
                )}
            </div>

            {/* Left Side: Expanded Info */}
            <motion.div 
                className={styles.triggerContent}
                initial={{ opacity: 0, width: 0 }}
                animate={{ 
                    opacity: shouldExpand ? 1 : 0,
                    width: shouldExpand ? "auto" : 0,
                    paddingRight: shouldExpand ? (hasDate ? "0.75rem" : "0.5rem") : 0,
                    paddingLeft: shouldExpand ? (hasDate ? "1rem" : "0.5rem") : 0,
                }}
                transition={{ duration: 0.2 }}
            >
                {/* Vertical Divider */}
                {shouldExpand && hasDate && (
                    <div className="w-px h-8 bg-white/10 absolute right-0 top-1/2 -translate-y-1/2" />
                )}

                {hasDate ? (
                    <div className="flex flex-col justify-center min-w-[100px] text-right h-full leading-tight">
                         {isSingleDay ? (
                            // Single Day: Just the full date, centered
                            <span className="text-white font-bold text-xs whitespace-nowrap">
                                {Jalali.formatDate(startDate!, 'd MMMM yyyy')}
                            </span>
                         ) : (
                            // Range: Stacked
                            <>
                                {/* Top: Start Date */}
                                <span className="text-white font-bold text-xs whitespace-nowrap">
                                     {Jalali.formatDate(startDate!, 'd MMMM yyyy')}
                                </span>
                                {/* Bottom: End Date */}
                                {endDate && (
                                    <span className="text-neon text-[10px] font-medium whitespace-nowrap opacity-90 mt-0.5">
                                        تا {Jalali.formatDate(endDate, 'd MMMM')}
                                    </span>
                                )}
                            </>
                         )}
                    </div>
                ) : (
                    <span className="text-white font-bold text-sm whitespace-nowrap px-2">
                        انتخاب بازه زمانی
                    </span>
                )}
            </motion.div>
        </div>
        
        {/* Internal Glow Effect */}
        <div className="absolute inset-0 bg-neon/5 blur-xl rounded-full animate-pulse pointer-events-none" />
      </motion.button>

      {/* Persistent Portal Pattern */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={styles.overlay}
              variants={animations.overlay}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsOpen(false)}
              style={{ zIndex: 9999 }}
            >
              <div className="absolute top-4 left-4 z-50 md:hidden">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    className="p-2 rounded-full bg-slate-800/50 text-white border border-white/10 hover:bg-neon/20 transition-colors"
                  >
                     <X className="w-6 h-6" />
                  </button>
              </div>

              {isMobile ? (
                <MobileView {...viewProps} />
              ) : (
                <DesktopView {...viewProps} />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default NeonDatePicker;
