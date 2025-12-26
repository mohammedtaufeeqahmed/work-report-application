import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWorkReportsByEmployeeIdsAndDate } from '@/lib/db/queries';
import type { ApiResponse } from '@/types';

// GET: Get work report statuses for multiple employees for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const employeeIdsParam = url.searchParams.get('employeeIds');
    const date = url.searchParams.get('date');

    if (!employeeIdsParam || !date) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required parameters: employeeIds and date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Parse employee IDs (comma-separated)
    const employeeIds = employeeIdsParam.split(',').filter(id => id.trim() !== '');

    if (employeeIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No employee IDs provided' },
        { status: 400 }
      );
    }

    // Fetch work reports for all employees for the specified date
    const reports = await getWorkReportsByEmployeeIdsAndDate(employeeIds, date);

    // Return a map of employeeId -> { status, exists }
    const statusMap: Record<string, { status: string | null; exists: boolean }> = {};
    employeeIds.forEach(employeeId => {
      const report = reports[employeeId];
      statusMap[employeeId] = {
        status: report ? report.status : null,
        exists: !!report,
      };
    });

    return NextResponse.json<ApiResponse<Record<string, { status: string | null; exists: boolean }>>>({
      success: true,
      data: statusMap,
    });
  } catch (error) {
    console.error('Get work report statuses error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch work report statuses' },
      { status: 500 }
    );
  }
}

