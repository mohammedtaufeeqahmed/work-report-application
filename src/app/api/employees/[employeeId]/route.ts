import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeLookup, getSafeEmployeeByEmployeeId, getWorkReportByEmployeeAndDate } from '@/lib/db/queries';
import { getISTTodayDateString } from '@/lib/date';
import type { ApiResponse, EmployeeLookup, SafeEmployee } from '@/types';

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { employeeId } = await context.params;
    
    if (!employeeId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Check if we need full employee data or just lookup data
    const url = new URL(request.url);
    const fullData = url.searchParams.get('full') === 'true';

    if (fullData) {
      // Return full employee data (without password)
      const employee = getSafeEmployeeByEmployeeId(employeeId);
      
      if (!employee) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Employee not found' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse<SafeEmployee>>({
        success: true,
        data: employee,
      });
    } else {
      // Return only lookup data (for work report form)
      const employee = getEmployeeLookup(employeeId);
      
      if (!employee) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Employee not found or inactive' },
          { status: 404 }
        );
      }

      // Check if employee already submitted a report for today (IST)
      const today = getISTTodayDateString();
      const existingReport = getWorkReportByEmployeeAndDate(employeeId, today);

      return NextResponse.json<ApiResponse<EmployeeLookup & { hasSubmittedToday: boolean }>>({
        success: true,
        data: {
          ...employee,
          hasSubmittedToday: !!existingReport,
        },
      });
    }
  } catch (error) {
    console.error('Employee lookup error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch employee data' },
      { status: 500 }
    );
  }
}

