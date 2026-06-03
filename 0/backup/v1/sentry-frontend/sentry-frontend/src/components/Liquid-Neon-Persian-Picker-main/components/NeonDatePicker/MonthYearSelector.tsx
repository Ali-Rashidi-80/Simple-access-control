
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import LiquidButton from './LiquidButton';
import * as Jalali from './utils';
import { styles } from './styles';

interface MonthYearSelectorProps {
  currentDate: Date;
  onSelectYear: (year: number) => void;
  onSelectMonth: (monthIndex: number) => void;
  onBack: () => void;
}

type SelectorMode = 'month' | 'year';

const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  currentDate,
  onSelectYear,
  onSelectMonth,
  onBack
}) => {
  const currentYear = Jalali.getJalaliYear(currentDate);
  const currentMonthIndex = Jalali.getJalaliMonth(currentDate);

  const [mode, setMode] = useState<SelectorMode>('month');
  // For year pagination (12 years per page)
  const [yearPageOffset, setYearPageOffset] = useState(0);

  // Calculate Year Grid
  const yearsPerPage = 12;
  const gridBaseYear = useMemo(() => {
    // Center the current year on the initial page or calculate based on offset
    const base = currentYear - (currentYear % yearsPerPage);
    return base + (yearPageOffset * yearsPerPage);
  }, [currentYear, yearPageOffset]);

  const years = useMemo(() => {
    return Array.from({ length: yearsPerPage }, (_, i) => gridBaseYear + i);
  }, [gridBaseYear]);

  const handleHeaderBack = () => {
    if (mode === 'year') {
      setMode('month');
      setYearPageOffset(0);
    } else {
      onBack();
    }
  };

  const handlePrev = () => {
    if (mode === 'month') {
      onSelectYear(currentYear - 1);
    } else {
      setYearPageOffset(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (mode === 'month') {
      onSelectYear(currentYear + 1);
    } else {
      setYearPageOffset(prev => prev + 1);
    }
  };

  const handleYearClick = (year: number) => {
    onSelectYear(year);
    setMode('month'); // Auto-switch back to month after selection
  };

  const toggleMode = () => {
    if (mode === 'month') {
      setMode('year');
      setYearPageOffset(0);
    } else {
      setMode('month');
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex flex-col px-8 py-6 landscape:px-12 landscape:py-4 overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 landscape:mb-2 shrink-0 w-full relative z-10">
        <LiquidButton variant="ghost" onClick={handleHeaderBack} className="!px-3 !py-2 !text-xs md:!text-sm">
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          {mode === 'year' ? 'بازگشت به ماه' : 'بازگشت'}
        </LiquidButton>
        
        <div className="flex items-center gap-2 md:gap-4 bg-white/5 rounded-full px-2 py-1 border border-white/10">
          <LiquidButton variant="icon" onClick={handlePrev} className="!p-1.5 hover:bg-white/10">
             <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </LiquidButton>
          
          <button 
            onClick={toggleMode}
            className="text-lg md:text-xl font-black text-neon w-32 text-center font-mono select-none hover:bg-white/5 rounded px-2 transition-colors cursor-pointer"
          >
            {mode === 'month' 
              ? currentYear 
              : `${years[0]} - ${years[years.length - 1]}`
            }
          </button>
          
          <LiquidButton variant="icon" onClick={handleNext} className="!p-1.5 hover:bg-white/10">
             <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </LiquidButton>
        </div>
        
        {/* Spacer for visual balance on desktop */}
        <div className="w-20 hidden md:block" /> 
      </div>

      {/* Grid Content */}
      <div className="flex-1 w-full max-w-[340px] md:max-w-full landscape:max-w-2xl mx-auto p-2 h-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {mode === 'month' ? (
            <motion.div 
              key="month-grid"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 md:grid-cols-4 landscape:grid-cols-4 gap-4 md:gap-6 landscape:gap-x-6 landscape:gap-y-3 w-full"
            >
              {Jalali.PERSIAN_MONTHS.map((month, index) => {
                const isActive = index === currentMonthIndex;
                return (
                  <motion.button
                    key={month}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectMonth(index)}
                    className={`
                      ${styles.monthButton} 
                      py-3 text-sm md:text-lg md:py-6 md:h-auto
                      landscape:py-2 landscape:text-xs landscape:h-10
                      ${isActive ? styles.monthButtonActive : 'text-slate-300'}
                    `}
                  >
                    <span className="relative z-10">{month}</span>
                    {isActive && (
                      <div className="absolute inset-0 bg-neon blur-md opacity-40" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              key="year-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 md:grid-cols-4 landscape:grid-cols-4 gap-4 md:gap-6 landscape:gap-x-6 landscape:gap-y-3 w-full"
            >
              {years.map((year) => {
                const isActive = year === currentYear;
                return (
                  <motion.button
                    key={year}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleYearClick(year)}
                    className={`
                      ${styles.monthButton} 
                      py-3 text-sm md:text-lg md:py-6 md:h-auto font-mono
                      landscape:py-2 landscape:text-xs landscape:h-10
                      ${isActive ? styles.monthButtonActive : 'text-slate-300'}
                    `}
                  >
                    <span className="relative z-10">{year}</span>
                    {isActive && (
                      <div className="absolute inset-0 bg-neon blur-md opacity-40" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MonthYearSelector;
