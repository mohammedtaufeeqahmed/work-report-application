'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkReport, Holiday } from '@/types';
import { 
  getISTNow, 
  getISTTodayDateString, 
  formatDateToIST
} from '@/lib/date';

interface WorkReportCalendarProps {
  reports: WorkReport[];
  holidays?: Holiday[]; // Array of holiday objects with names
  onDateClick?: (date: string) => void;
}

function WorkReportCalendarComponent({ reports, holidays = [], onDateClick }: WorkReportCalendarProps) {
  const [currentDate, setCurrentDate] = useState(getISTNow());
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const today = getISTTodayDateString();

  // Create a map of reports by date for quick lookup
  const reportsByDate = useMemo(() => {
    const map = new Map<string, WorkReport>();
    reports.forEach(report => {
      map.set(report.date, report);
    });
    return map;
  }, [reports]);

  // Create a map of holidays by date (with names) for quick lookup
  const holidaysMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach(holiday => {
      map.set(holiday.date, holiday);
    });
    return map;
  }, [holidays]);

  // Create a set of holiday dates for quick lookup
  const holidaysSet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Helper function to check if a date is Sunday
  const isSunday = useCallback((dateStr: string): boolean => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0; // 0 = Sunday
  }, []);

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(getISTNow());
  };

  // Get date status for color coding
  const getDateStatus = (dateStr: string): 'working' | 'leave' | 'not_submitted' | 'working_on_duty' | 'working_halfday' | 'holiday' | 'sunday' | 'future' => {
    // Check if it's Sunday first (Sunday is always a holiday)
    if (isSunday(dateStr)) {
      return 'sunday';
    }

    // Check if it's a marked holiday
    if (holidaysSet.has(dateStr)) {
      return 'holiday';
    }

    // Check if it's a future date
    if (dateStr > today) {
      return 'future';
    }

    const report = reportsByDate.get(dateStr);
    
    if (!report) {
      return 'not_submitted';
    }

    if (report.status === 'leave') {
      return 'leave';
    }

    if (report.status === 'working' && report.onDuty) {
      return 'working_on_duty';
    }

    if (report.status === 'working' && report.halfday) {
      return 'working_halfday';
    }

    if (report.status === 'working') {
      return 'working';
    }

    return 'not_submitted';
  };

  // Get color class for date
  const getDateColorClass = (dateStr: string, isCurrentMonth: boolean): string => {
    if (!isCurrentMonth) {
      return 'text-muted-foreground/30';
    }

    const status = getDateStatus(dateStr);
    const isToday = dateStr === today;

    switch (status) {
      case 'sunday':
        return `bg-gray-500 text-white ${isToday ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`;
      case 'holiday':
        return `bg-gradient-to-br from-violet-500 to-purple-600 text-white ${isToday ? 'ring-2 ring-violet-400 ring-offset-2' : ''}`;
      case 'working':
        return `bg-emerald-500 text-white ${isToday ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`;
      case 'working_halfday':
        return `bg-yellow-500 text-white ${isToday ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`;
      case 'leave':
        return `bg-orange-500 text-white ${isToday ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`;
      case 'working_on_duty':
        // Diagonal split will be handled with absolute positioning
        return `relative overflow-hidden ${isToday ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`;
      case 'not_submitted':
        return `bg-red-500 text-white ${isToday ? 'ring-2 ring-red-400 ring-offset-2' : ''}`;
      case 'future':
        return 'text-muted-foreground/40 bg-muted/20';
      default:
        return 'text-foreground';
    }
  };

  // Get tooltip text for date
  const getTooltipText = useCallback((dateStr: string): string => {
    const status = getDateStatus(dateStr);
    
    if (status === 'sunday') {
      return `${dateStr} - Sunday (Holiday)`;
    }
    
    if (status === 'holiday') {
      const holiday = holidaysMap.get(dateStr);
      const holidayName = holiday?.name || 'Holiday';
      return `${dateStr} - ${holidayName}`;
    }
    
    const statusLabels: Record<string, string> = {
      'working': 'Working',
      'working_halfday': 'Half Day',
      'leave': 'Leave',
      'working_on_duty': 'Working + On Duty',
      'not_submitted': 'Not Submitted',
      'future': 'Future'
    };
    
    return `${dateStr} - ${statusLabels[status] || 'Unknown'}`;
  }, [holidaysMap, getDateStatus]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ dateStr: string; day: number; isCurrentMonth: boolean }> = [];

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      const dateStr = formatDateToIST(date);
      days.push({ dateStr, day, isCurrentMonth: false });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = formatDateToIST(date);
      days.push({ dateStr, day, isCurrentMonth: true });
    }

    // Next month's leading days (to fill the grid)
    const totalCells = days.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      const dateStr = formatDateToIST(date);
      days.push({ dateStr, day, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="w-full rounded-2xl border bg-card shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <CalendarIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Calendar</h3>
              <p className="text-xs text-muted-foreground">Work report status</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs h-8 px-3 hover:bg-primary/10"
          >
            Today
          </Button>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h4 className="font-semibold text-lg tracking-tight">
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-5 bg-gradient-to-b from-card to-card/50">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map(({ dateStr, day, isCurrentMonth }) => {
            const status = getDateStatus(dateStr);
            const isToday = dateStr === today;
            const isWorkingOnDuty = status === 'working_on_duty';
            
            return (
              <button
                key={dateStr}
                onClick={() => onDateClick?.(dateStr)}
                className={`
                  aspect-square rounded-xl text-sm font-semibold transition-all duration-200
                  hover:scale-110 active:scale-95 hover:shadow-md relative
                  ${getDateColorClass(dateStr, isCurrentMonth)}
                  ${!isCurrentMonth ? 'opacity-30' : ''}
                  ${onDateClick ? 'cursor-pointer' : 'cursor-default'}
                  ${status === 'future' ? 'hover:bg-muted/30' : ''}
                `}
                title={getTooltipText(dateStr)}
              >
                {/* Diagonal split for working_on_duty: green (top-left) and blue (bottom-right) */}
                {isWorkingOnDuty && (
                  <>
                    <div className="absolute inset-0 bg-emerald-500" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                    <div className="absolute inset-0 bg-blue-600" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
                    <span className="relative z-10 text-white">{day}</span>
                  </>
                )}
                {!isWorkingOnDuty && <span>{day}</span>}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">Legend</p>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-emerald-500 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Working</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-yellow-500 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Half Day</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-orange-500 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Leave</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-red-500 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Not Submitted</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                <div className="absolute inset-0 bg-blue-600" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
              </div>
              <span className="text-muted-foreground font-medium">On Duty</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-gray-500 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Sunday</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-4 h-4 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm"></div>
              <span className="text-muted-foreground font-medium">Holiday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const WorkReportCalendar = memo(WorkReportCalendarComponent, (prevProps, nextProps) => {
  // Only re-render if reports or holidays actually change
  if (prevProps.reports.length !== nextProps.reports.length) return false;
  if (prevProps.holidays?.length !== nextProps.holidays?.length) return false;
  
  // Check if reports have changed
  const prevReportIds = prevProps.reports.map(r => `${r.id}-${r.date}`).join(',');
  const nextReportIds = nextProps.reports.map(r => `${r.id}-${r.date}`).join(',');
  if (prevReportIds !== nextReportIds) return false;
  
  // Check if holidays have changed
  const prevHolidays = prevProps.holidays?.map(h => `${h.id}-${h.date}`).join(',') || '';
  const nextHolidays = nextProps.holidays?.map(h => `${h.id}-${h.date}`).join(',') || '';
  if (prevHolidays !== nextHolidays) return false;
  
  return true; // Props are equal, skip re-render
});

