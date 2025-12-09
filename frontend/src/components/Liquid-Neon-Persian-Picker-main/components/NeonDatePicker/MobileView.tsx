
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Calendar, Trash2 } from 'lucide-react';
import * as Jalali from './utils';
import LiquidButton from './LiquidButton';
import MonthYearSelector from './MonthYearSelector';
import { ViewProps, ShortcutType } from './types';
import { styles, animations } from './styles';

const MobileView: React.FC<ViewProps> = (props) => {
  const days = Jalali.generateMonthGrid(props.currentDate);
  const monthLabel = Jalali.formatMonthYear(props.currentDate);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={animations.container}
      className={`${styles.glassContainer} rounded-2xl w-[95vw] max-w-[400px] md:max-w-[550px] landscape:max-w-[600px] landscape:flex-row h-auto max-h-[85vh] overflow-hidden`}
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

      {/* Landscape Sidebar / Portrait Header */}
      <div className="flex-shrink-0 border-b landscape:border-b-0 landscape:border-l border-white/10 landscape:w-48 bg-slate-900/40 flex flex-col relative z-10">
          <div className="hidden landscape:flex items-center justify-between p-3 border-b border-white/10">
              <span className="text-neon text-xs font-bold flex items-center gap-1">
                 <Calendar className="w-3 h-3"/> میانبرها
              </span>
          </div>

          <div className="p-2 overflow-x-auto whitespace-nowrap landscape:overflow-y-auto landscape:whitespace-normal landscape:flex-1 landscape:flex landscape:flex-col gap-2 scrollbar-hide">
             <div className="flex gap-2 landscape:flex-col">
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
                        className="!py-1.5 !px-3 !text-xs rounded-lg flex-shrink-0 landscape:w-full"
                    >
                        {sc.label}
                    </LiquidButton>
                ))}
             </div>
          </div>
          
          <div className="hidden landscape:block p-3 border-t border-white/10 bg-black/20">
             <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                     <span className="text-slate-500">شروع</span>
                     <span className="text-white font-mono">{props.startDate ? Jalali.formatDate(props.startDate) : '-'}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                     <span className="text-slate-500">پایان</span>
                     <span className="text-neon font-mono">{props.endDate ? Jalali.formatDate(props.endDate) : '-'}</span>
                 </div>
             </div>
          </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex items-center justify-between px-2 py-3 landscape:py-2 sticky top-0 bg-glass-bg/90 backdrop-blur-sm z-20 shadow-sm">
            <LiquidButton variant="icon" onClick={() => props.onMonthChange(-1)} className="!p-1.5">
                <ChevronRight className="w-5 h-5" />
            </LiquidButton>
            
            <motion.button 
                key={monthLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => props.onViewModeChange('month-year')}
                className="text-lg landscape:text-base font-black text-white hover:text-neon transition-colors"
            >
                {monthLabel}
            </motion.button>

            <LiquidButton variant="icon" onClick={() => props.onMonthChange(1)} className="!p-1.5">
                <ChevronLeft className="w-5 h-5" />
            </LiquidButton>
        </div>

        <div className="grid grid-cols-7 px-2 mb-1 z-10">
            {Jalali.WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-slate-500 font-medium text-[10px] landscape:text-xs py-1">
                {day}
            </div>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 relative">
             <AnimatePresence initial={false} custom={props.direction} mode="popLayout">
                <motion.div
                    key={props.currentDate.toString()}
                    custom={props.direction}
                    variants={animations.slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="grid grid-cols-7 gap-1 p-1"
                >
                    {days.map((day) => {
                        const isCurrentMonth = Jalali.isSameDay(day, Jalali.startOfMonth(props.currentDate)) || Jalali.isSameDay(day, Jalali.endOfMonth(props.currentDate)) || Jalali.formatDate(day, 'MM') === Jalali.formatDate(props.currentDate, 'MM');

                        let dayClass = `${styles.gridDay} w-full aspect-square landscape:aspect-auto landscape:h-8 `;
                        let rangeStatus: 'start' | 'end' | 'middle' | 'hover-middle' | null = null;
                        
                        // Only calculate selection for current month days
                        if (isCurrentMonth) {
                             rangeStatus = Jalali.isDateInRange(day, props.startDate, props.endDate, props.hoverDate);
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
                                whileTap={{ scale: 0.9 }}
                                onClick={() => isCurrentMonth && props.onDateClick(day)}
                                className={dayClass}
                                disabled={!isCurrentMonth}
                            >
                                <span className="relative z-10">{Jalali.formatDate(day, 'd')}</span>
                                {Jalali.isSameDay(day, new Date()) && !isStart && !isEnd && (
                                <div className="absolute bottom-1 w-1 h-1 bg-neon rounded-full shadow-[0_0_5px_#00F0FF]" />
                                )}
                            </motion.button>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
        </div>
      
        <div className={styles.actionFooter}>
            <div className="flex items-center gap-2">
                <button onClick={props.onCancel} className={styles.cancelBtn}>
                    انصراف
                </button>
                {(props.startDate || props.endDate) && (
                    <button onClick={props.onReset} className={styles.resetBtn}>
                        <Trash2 className="w-3 h-3" />
                        <span>پاک کردن</span>
                    </button>
                )}
            </div>
            <button onClick={props.onConfirm} className={styles.confirmBtn}>
                تایید و ثبت
            </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileView;
