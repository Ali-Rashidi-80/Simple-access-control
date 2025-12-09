
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Clock, Trash2 } from 'lucide-react';
import * as Jalali from './utils';
import LiquidButton from './LiquidButton';
import MonthYearSelector from './MonthYearSelector';
import { ViewProps, ShortcutType } from './types';
import { styles, animations } from './styles';

const CalendarGrid: React.FC<{
  date: Date;
  startDate: Date | null;
  endDate: Date | null;
  hoverDate: Date | null;
  onDateClick: (d: Date) => void;
  onDateHover: (d: Date) => void;
  onTitleClick?: () => void;
}> = ({ date, startDate, endDate, hoverDate, onDateClick, onDateHover, onTitleClick }) => {
  const days = Jalali.generateMonthGrid(date);
  const monthLabel = Jalali.formatMonthYear(date);

  return (
    <div className="flex-1 min-w-[300px]">
      <div className="flex items-center justify-center mb-6 h-8 overflow-hidden">
        <motion.button 
            key={monthLabel}
            initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
            transition={{ duration: 0.3, ease: "backOut" }}
            onClick={onTitleClick}
            className={styles.headerTitle}
        >
            {monthLabel}
        </motion.button>
      </div>
      
      <div className="grid grid-cols-7 mb-3">
        {Jalali.WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-slate-500 font-medium text-xs py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 gap-x-1 p-1">
        {days.map((day) => {
           const isCurrentMonth = Jalali.isSameDay(day, Jalali.startOfMonth(date)) || Jalali.isSameDay(day, Jalali.endOfMonth(date)) || Jalali.formatDate(day, 'MM') === Jalali.formatDate(date, 'MM');
           
           let dayClass = `${styles.gridDay} w-9 h-9 md:w-10 md:h-10 mx-auto `;
           let rangeStatus: 'start' | 'end' | 'middle' | 'hover-middle' | null = null;

           // Only calculate selection if it's the current month
           if (isCurrentMonth) {
             rangeStatus = Jalali.isDateInRange(day, startDate, endDate, hoverDate);
           }

           const isStart = rangeStatus === 'start';
           const isEnd = rangeStatus === 'end';
           const isMiddle = rangeStatus === 'middle' || rangeStatus === 'hover-middle';

           if (!isCurrentMonth) {
             dayClass += styles.dayDisabled;
           } else if (isStart || isEnd) {
             dayClass += styles.dayStartEnd;
           } else if (isMiddle) {
             dayClass += styles.dayMiddle;
             if (rangeStatus === 'hover-middle') dayClass += " border border-dashed border-neon/30 ";
           } else {
             dayClass += styles.dayDefault;
           }

           return (
               <motion.button
                 key={day.toString()}
                 variants={animations.day}
                 whileHover={isCurrentMonth ? "hover" : ""}
                 whileTap={isCurrentMonth ? "tap" : ""}
                 onClick={() => isCurrentMonth && onDateClick(day)}
                 onMouseEnter={() => isCurrentMonth && onDateHover(day)}
                 className={dayClass}
                 disabled={!isCurrentMonth}
                 layout 
               >
                 {(isStart || isEnd) && (
                   <motion.div 
                     layoutId="selection-glow" 
                     className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" 
                     transition={{ duration: 0.2 }}
                   />
                 )}
                 {Jalali.formatDate(day, 'd')}
                 {Jalali.isSameDay(day, new Date()) && !isStart && !isEnd && (
                   <div className="absolute bottom-1 w-1 h-1 bg-neon rounded-full shadow-[0_0_5px_#00F0FF]" />
                 )}
               </motion.button>
           );
        })}
      </div>
    </div>
  );
};

const DesktopView: React.FC<ViewProps> = (props) => {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={animations.container}
      className={`${styles.glassContainer} rounded-3xl w-full max-w-5xl flex flex-row overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <AnimatePresence>
        {props.viewMode === 'month-year' && (
          <MonthYearSelector 
            currentDate={props.currentDate}
            onSelectYear={props.onSelectYear}
            onSelectMonth={props.onSelectMonth}
            onBack={() => props.onViewModeChange('calendar')}
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Right in RTL) */}
      <motion.div 
        variants={{ hidden: { x: 20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}
        className={`w-64 border-l ${styles.sidebar} p-6 flex flex-col gap-4 hidden md:flex`}
      >
        <div className="mb-2">
            <h3 className="text-neon text-lg font-bold flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5" />
                <span>دسترسی سریع</span>
            </h3>
            <p className="text-xs text-slate-400">بازه زمانی</p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: 'امروز', type: ShortcutType.TODAY },
            { label: 'دیروز', type: ShortcutType.YESTERDAY },
            { label: 'هفته جاری', type: ShortcutType.THIS_WEEK },
            { label: 'ماه قبل', type: ShortcutType.LAST_MONTH },
          ].map(sc => (
             <LiquidButton 
                key={sc.type}
                active={props.activeShortcut === sc.type} 
                onClick={() => props.onShortcut(sc.type)}
             >
                {sc.label}
             </LiquidButton>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-white/10">
           <div className="text-xs text-slate-500 mb-2 text-right">محدوده انتخابی</div>
           <div className="text-white text-sm font-mono bg-black/20 p-3 rounded-lg border border-white/5 text-center mb-2 shadow-inner">
             {props.startDate ? Jalali.formatDate(props.startDate) : '---'} 
             <span className="mx-2 text-neon text-xs">شروع</span>
           </div>
           <div className="text-white text-sm font-mono bg-black/20 p-3 rounded-lg border border-white/5 text-center shadow-inner">
             {props.endDate ? Jalali.formatDate(props.endDate) : '---'} 
             <span className="mx-2 text-neon text-xs">پایان</span>
           </div>
        </div>
      </motion.div>

      {/* Main Content (Calendars + Footer) */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex-1 p-8">
            <div className="flex items-start justify-between gap-8 flex-col lg:flex-row relative">
                <div className="absolute top-6 right-6 z-20">
                    <LiquidButton variant="icon" onClick={() => props.onMonthChange(-1)}>
                        <ChevronRight className="w-6 h-6" />
                    </LiquidButton>
                </div>

                {/* Animated Calendar Wrapper */}
                <div className="flex-1 w-full relative">
                  <AnimatePresence initial={false} custom={props.direction} mode="popLayout">
                    <motion.div
                        key={props.currentDate.toString()}
                        custom={props.direction}
                        variants={animations.slide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="flex flex-col lg:flex-row gap-8 w-full"
                    >
                        {/* Current Month */}
                        <CalendarGrid 
                        date={props.currentDate}
                        {...props}
                        onTitleClick={() => props.onViewModeChange('month-year')}
                        />

                        {/* Divider */}
                        <div className="hidden lg:block w-px bg-white/5 self-stretch mx-2" />
                        
                        {/* Next Month */}
                        <div className="hidden lg:block">
                        <CalendarGrid 
                            date={Jalali.addMonths(props.currentDate, 1)}
                            {...props}
                            onTitleClick={() => props.onViewModeChange('month-year')}
                        />
                        </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="absolute top-6 left-6 z-20">
                    <LiquidButton variant="icon" onClick={() => props.onMonthChange(1)}>
                        <ChevronLeft className="w-6 h-6" />
                    </LiquidButton>
                </div>
            </div>
        </div>

        {/* Action Footer */}
        <motion.div 
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className={styles.actionFooter}
        >
            <div className="flex items-center gap-2">
                <button onClick={props.onCancel} className={styles.cancelBtn}>
                    انصراف
                </button>
                {(props.startDate || props.endDate) && (
                    <button onClick={props.onReset} className={styles.resetBtn}>
                        <Trash2 className="w-4 h-4" />
                        <span>پاک کردن</span>
                    </button>
                )}
            </div>
            <button onClick={props.onConfirm} className={styles.confirmBtn}>
                تایید و ثبت
            </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DesktopView;
