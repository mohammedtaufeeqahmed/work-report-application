// Utility functions to standardize all date handling to Indian Standard Time (IST)
// IST is UTC+5:30

const IST_OFFSET_MINUTES = 5.5 * 60; // 330 minutes

/**
 * Returns a Date object representing "now" in IST.
 */
export function getISTNow(): Date {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMillis + IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Returns today's date string in IST in YYYY-MM-DD format.
 */
export function getISTTodayDateString(): string {
  return formatDateToIST(getISTNow());
}

/**
 * Returns a date range (start/end as YYYY-MM-DD strings) for "today" in IST.
 */
export function getISTTodayRange() {
  const today = getISTTodayDateString();
  return {
    start: today,
    end: today,
  };
}

/**
 * Returns a date range for the past N days (including today) in IST.
 */
export function getISTDateRangeFromDays(days: number) {
  const istNow = getISTNow();
  const end = formatDateToIST(istNow);
  
  const startDate = new Date(istNow);
  startDate.setDate(startDate.getDate() - days + 1);
  const start = formatDateToIST(startDate);
  
  return { start, end };
}

/**
 * Formats a Date object to YYYY-MM-DD string (for IST dates).
 */
export function formatDateToIST(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string for display in Indian locale.
 */
export function formatDateForDisplay(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  };
  return new Date(dateStr + 'T00:00:00+05:30').toLocaleDateString('en-IN', options || defaultOptions);
}

/**
 * Formats a date string to show short day (e.g., "Mon").
 */
export function getShortDayIST(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+05:30').toLocaleDateString('en-IN', { 
    weekday: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Formats a date string to show short date (e.g., "Dec 3").
 */
export function getShortDateIST(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+05:30').toLocaleDateString('en-IN', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Formats a date string to show full date (e.g., "Wednesday, December 3, 2025").
 */
export function getFullDateIST(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+05:30').toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Gets the day of month from a date string.
 */
export function getDayOfMonthIST(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00+05:30').getDate();
}

/**
 * Returns the current year in IST.
 */
export function getISTYear(): number {
  return getISTNow().getFullYear();
}

/**
 * Converts a UTC datetime string (from database) to IST date string (YYYY-MM-DD).
 * Handles formats like "YYYY-MM-DD HH:MM:SS" (PostgreSQL) or ISO strings.
 */
export function convertUTCToISTDate(utcDatetime: string): string {
  // Parse the UTC datetime
  let date: Date;
  
  if (utcDatetime.includes('T')) {
    // ISO format - ensure it's treated as UTC
    // If it doesn't end with 'Z', add it to ensure UTC parsing
    const isoString = utcDatetime.endsWith('Z') ? utcDatetime : utcDatetime + 'Z';
    date = new Date(isoString);
  } else if (utcDatetime.includes(' ')) {
    // PostgreSQL format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
    date = new Date(utcDatetime.replace(' ', 'T') + 'Z');
  } else {
    // Just date: "YYYY-MM-DD"
    return utcDatetime;
  }
  
  // Validate the date
  if (isNaN(date.getTime())) {
    // If parsing failed, try to extract just the date part
    const dateMatch = utcDatetime.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    // Fallback: return today's date
    return getISTTodayDateString();
  }
  
  // Convert to IST by adding 5:30 hours
  const istMillis = date.getTime() + IST_OFFSET_MINUTES * 60 * 1000;
  const istDate = new Date(istMillis);
  
  return formatDateToIST(istDate);
}