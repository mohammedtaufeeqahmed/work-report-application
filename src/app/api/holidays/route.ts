import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { canMarkHolidays } from '@/lib/permissions';
import { getHolidays, createHoliday, checkHolidayExists, getEmployeeById } from '@/lib/db/queries';
import { logger } from '@/lib/logger';
import type { ApiResponse, Holiday } from '@/types';

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
    const yearParam = url.searchParams.get('year');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let holidays: Holiday[] = [];

    if (yearParam) {
      const year = parseInt(yearParam);
      holidays = await getHolidays(year);
    } else if (startDate && endDate) {
      holidays = await getHolidays(undefined, startDate, endDate);
    } else {
      holidays = await getHolidays(); // Default: current year and next year
    }

    // Check if client wants full objects or just dates
    const returnFull = url.searchParams.get('full') === 'true';

    const response = returnFull
      ? NextResponse.json<ApiResponse<Holiday[]>>({
          success: true,
          data: holidays,
        })
      : NextResponse.json<ApiResponse<string[]>>({
          success: true,
          data: holidays.map(h => h.date).sort(),
        });

    // Add caching headers for holidays (they don't change frequently)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    logger.error('Get holidays error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

// POST: Create a new holiday
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    if (!canMarkHolidays(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have permission to mark holidays' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { date, name } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if holiday already exists
    const exists = await checkHolidayExists(date);
    if (exists) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Holiday already exists for this date' },
        { status: 409 }
      );
    }

    // Get employee ID from session
    const employee = await getEmployeeById(session.id);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Create holiday
    const holiday = await createHoliday(date, name || null, employee.id);

    return NextResponse.json<ApiResponse<Holiday>>({
      success: true,
      data: holiday,
      message: 'Holiday created successfully',
    });
  } catch (error) {
    logger.error('Create holiday error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}

