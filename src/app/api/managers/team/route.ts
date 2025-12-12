import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTeamEmployeesForManager, getAllEmployees, getManagerDepartmentIds } from '@/lib/db/queries';
import type { ApiResponse, SafeEmployee } from '@/types';

// GET: Get team employees for the current manager or employees from assigned departments for Operations users
export async function GET(request: NextRequest) {
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
        { success: false, error: 'You do not have permission to access this endpoint' },
        { status: 403 }
      );
    }

    let employeesList: SafeEmployee[];

    if (session.role === 'manager' || session.department === 'Operations') {
      // Managers and Operations users see employees from their assigned departments
      // Reuse the same function that works for managers (it uses manager_departments table)
      employeesList = await getTeamEmployeesForManager(session.id);
    } else {
      // Other non-manager users with mark_attendance permission can see all active employees
      const allEmployees = await getAllEmployees();
      employeesList = allEmployees.filter(emp => emp.status === 'active' && emp.employeeId !== session.employeeId);
    }

    return NextResponse.json<ApiResponse<SafeEmployee[]>>({
      success: true,
      data: employeesList,
    });
  } catch (error) {
    console.error('Get team employees error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
