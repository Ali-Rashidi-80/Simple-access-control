
export type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

export type DateSelectionHandler = (range: DateRange) => void;

export enum ShortcutType {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_MONTH = 'LAST_MONTH',
}

export type ViewMode = 'calendar' | 'month-year';

export interface NeonDatePickerProps {
  onChange?: DateSelectionHandler;
  onReset?: () => void;
  className?: string;
  defaultOpen?: boolean;
}

export interface ViewProps {
  currentDate: Date;
  startDate: Date | null;
  endDate: Date | null;
  hoverDate: Date | null;
  activeShortcut: ShortcutType | null;
  viewMode: ViewMode;
  direction: number; // 1 for next, -1 for prev
  onDateClick: (day: Date) => void;
  onDateHover: (day: Date) => void;
  onShortcut: (type: ShortcutType) => void;
  onMonthChange: (amount: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectYear: (year: number) => void;
  onSelectMonth: (monthIndex: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReset: () => void;
}
