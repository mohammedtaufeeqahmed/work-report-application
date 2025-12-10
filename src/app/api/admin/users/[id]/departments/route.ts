import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getEmployeeById,
  getManagerDepartments,
  setManagerDepartments 
} from '@/lib/db/queries';
import type { ApiResponse, Department } from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Get departments for a manager
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const managerId = parseInt(id);

    if (isNaN(managerId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const employee = await getEmployeeById(managerId);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (employee.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User is not a manager' },
        { status: 400 }
      );
    }

    const departments = await getManagerDepartments(managerId);

    return NextResponse.json<ApiResponse<Department[]>>({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Get manager departments error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch manager departments' },
      { status: 500 }
    );
  }
}

// PUT: Set departments for a manager (replaces existing)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only admins can set manager departments' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const managerId = parseInt(id);

    if (isNaN(managerId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const employee = await getEmployeeById(managerId);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (employee.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User is not a manager' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { departmentIds } = body;

    if (!Array.isArray(departmentIds)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'departmentIds must be an array' },
        { status: 400 }
      );
    }

    await setManagerDepartments(managerId, departmentIds);

    const departments = await getManagerDepartments(managerId);

    return NextResponse.json<ApiResponse<Department[]>>({
      success: true,
      data: departments,
      message: 'Manager departments updated successfully',
    });
  } catch (error) {
    console.error('Set manager departments error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to set manager departments' },
      { status: 500 }
    );
  }
}
