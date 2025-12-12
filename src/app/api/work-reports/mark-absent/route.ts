import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getEmployeeByEmployeeId,
  getTeamEmployeesForManager,
  getWorkReportByEmployeeAndDate,
  createWorkReport,
  updateWorkReport
} from '@/lib/db/queries';
import type { ApiResponse, WorkReport } from '@/types';

// POST: Mark an employee as absent (manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has mark_attendance permission
    const hasMarkAttendancePermission = session.pageAccess?.mark_attendance === true;
    
    if (!hasMarkAttendancePermission) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have permission to mark employees as absent' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { employeeId, date } = body;

    // Validate required fields
    if (!employeeId || !date) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields: employeeId and date are required' },
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

    // Get the employee
    const employee = await getEmployeeByEmployeeId(employeeId);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // For managers and Operations users, verify that the employee is in their assigned departments
    // For other users with mark_attendance permission, allow marking any employee
    if (session.role === 'manager' || session.department === 'Operations') {
      const teamEmployees = await getTeamEmployeesForManager(session.id);
      const isTeamMember = teamEmployees.some(emp => emp.employeeId === employeeId);
      
      if (!isTeamMember) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'You can only mark absent for employees in your assigned departments' },
          { status: 403 }
        );
      }
    }
    // Other non-manager users with mark_attendance permission can mark any employee, no department check needed

    // Check if a work report already exists for this employee and date
    const existingReport = await getWorkReportByEmployeeAndDate(employeeId, date);
    
    if (existingReport) {
      // Update existing report to leave status (absent is treated as leave)
      const updatedReport = await updateWorkReport(
        existingReport.id,
        'leave',
        null, // Clear work report when marking as absent
        false // onDuty
      );

      return NextResponse.json<ApiResponse<WorkReport>>({
        success: true,
        data: updatedReport!,
        message: 'Employee marked as absent (leave) successfully',
      });
    } else {
      // Create new work report with leave status (absent is treated as leave)
      const newReport = await createWorkReport({
        employeeId: employee.employeeId,
        date,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        status: 'leave',
        workReport: null,
        onDuty: false,
      });

      return NextResponse.json<ApiResponse<WorkReport>>({
        success: true,
        data: newReport,
        message: 'Employee marked as absent successfully',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Mark absent error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to mark employee as absent' },
      { status: 500 }
    );
  }
}
