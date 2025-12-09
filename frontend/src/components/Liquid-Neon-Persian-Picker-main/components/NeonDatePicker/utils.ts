
import {
  format as formatJalali,
  endOfMonth as endOfMonthJalali,
  eachDayOfInterval,
  addMonths as addMonthsJalali,
  subMonths as subMonthsJalali,
  isSameDay as isSameDayJalali,
  isWithinInterval,
  startOfWeek as startOfWeekJalali,
  endOfWeek as endOfWeekJalali,
  isBefore as isBeforeJalali,
  isAfter as isAfterJalali,
  getYear as getYearJalali,
  getMonth as getMonthJalali,
  setYear as setYearJalali,
  setMonth as setMonthJalali,
  subDays as subDaysJalali,
  startOfMonth as startOfMonthJalali,
} from 'date-fns-jalali';

export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export const formatMonthYear = (date: Date): string => {
  return formatJalali(date, 'MMMM yyyy');
};

export const formatDate = (date: Date, formatStr: string = 'yyyy/MM/dd'): string => {
  return formatJalali(date, formatStr);
};

export const generateMonthGrid = (date: Date): Date[] => {
  const monthStart = startOfMonthJalali(date);
  const monthEnd = endOfMonthJalali(date);
  
  // Jalali weeks start on Saturday (6)
  const start = startOfWeekJalali(monthStart, { weekStartsOn: 6 });
  const end = endOfWeekJalali(monthEnd, { weekStartsOn: 6 });

  return eachDayOfInterval({ start, end });
};

export const isDateInRange = (
  date: Date, 
  startDate: Date | null, 
  endDate: Date | null, 
  hoverDate: Date | null
): 'start' | 'end' | 'middle' | 'hover-middle' | null => {
  if (startDate && isSameDayJalali(date, startDate)) return 'start';
  if (endDate && isSameDayJalali(date, endDate)) return 'end';
  
  if (startDate && endDate) {
    const start = isBeforeJalali(startDate, endDate) ? startDate : endDate;
    const end = isBeforeJalali(startDate, endDate) ? endDate : startDate;
    
    if (isWithinInterval(date, { start, end })) return 'middle';
  }
  
  if (startDate && !endDate && hoverDate) {
    const start = isBeforeJalali(startDate, hoverDate) ? startDate : hoverDate;
    const end = isBeforeJalali(startDate, hoverDate) ? hoverDate : startDate;
    
    // Check intersection for hover state
    if (isWithinInterval(date, { start, end }) && !isSameDayJalali(date, startDate)) {
      return 'hover-middle';
    }
  }
  
  return null;
};

export const isSameDay = isSameDayJalali;
export const startOfMonth = startOfMonthJalali;
export const endOfMonth = endOfMonthJalali;
export const addMonths = addMonthsJalali;
export const subDays = subDaysJalali;
export const subMonths = subMonthsJalali;
export const setYear = setYearJalali;
export const setMonth = setMonthJalali;
export const getJalaliYear = getYearJalali;
export const getJalaliMonth = getMonthJalali;
export const isBefore = isBeforeJalali;
export const isAfter = isAfterJalali;
