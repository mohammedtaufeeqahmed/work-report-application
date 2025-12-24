import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { ApiResponse } from '@/types';

// Simple holidays list - can be extended to use database later
// Format: YYYY-MM-DD
const HOLIDAYS: Record<string, string[]> = {
  '2024': [
    '2024-01-26', // Republic Day
    '2024-03-08', // Holi
    '2024-03-29', // Good Friday
    '2024-04-11', // Eid ul-Fitr
    '2024-08-15', // Independence Day
    '2024-10-02', // Gandhi Jayanti
    '2024-10-31', // Diwali
    '2024-11-01', // Diwali
    '2024-12-25', // Christmas
  ],
  '2025': [
    '2025-01-26', // Republic Day
    '2025-03-14', // Holi
    '2025-04-18', // Good Friday
    '2025-03-31', // Eid ul-Fitr
    '2025-08-15', // Independence Day
    '2025-10-02', // Gandhi Jayanti
    '2025-10-20', // Diwali
    '2025-10-21', // Diwali
    '2025-12-25', // Christmas
  ],
  '2026': [
    '2026-01-26', // Republic Day
    '2026-03-03', // Holi
    '2026-04-03', // Good Friday
    '2026-03-20', // Eid ul-Fitr
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-11-08', // Diwali
    '2026-11-09', // Diwali
    '2026-12-25', // Christmas
  ],
};

// GET: Get holidays for a specific year or date range
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let holidays: string[] = [];

    if (year) {
      // Get holidays for specific year
      holidays = HOLIDAYS[year] || [];
    } else if (startDate && endDate) {
      // Get holidays in date range
      const allHolidays: string[] = [];
      Object.values(HOLIDAYS).forEach(yearHolidays => {
        allHolidays.push(...yearHolidays);
      });
      holidays = allHolidays.filter(date => date >= startDate && date <= endDate);
    } else {
      // Get all holidays for current year and next year
      const currentYear = new Date().getFullYear().toString();
      const nextYear = (new Date().getFullYear() + 1).toString();
      holidays = [
        ...(HOLIDAYS[currentYear] || []),
        ...(HOLIDAYS[nextYear] || []),
      ];
    }

    return NextResponse.json<ApiResponse<string[]>>({
      success: true,
      data: holidays.sort(),
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

