import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, isAdmin, isSuperAdmin } from '@/lib/auth';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/db/queries';
import type { ApiResponse, SafeEmployee, UpdateEmployeeInput, PageAccess, Employee } from '@/types';

// Helper to convert Employee to SafeEmployee with parsed pageAccess
function toSafeEmployee(emp: Employee): SafeEmployee {
  let parsedPageAccess: PageAccess | null = null;
  if (emp.pageAccess) {
    try {
      parsedPageAccess = JSON.parse(emp.pageAccess);
    } catch {
      parsedPageAccess = null;
    }
  }
  return {
    id: emp.id,
    employeeId: emp.employeeId,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    entityId: emp.entityId,
    branchId: emp.branchId,
    role: emp.role,
    status: emp.status,
    pageAccess: parsedPageAccess,
    createdBy: emp.createdBy,
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Get user by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const employee = getEmployeeById(userId);

    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Admin can only view users in their entity/branch
    if (session.role === 'admin') {
      if (employee.entityId !== session.entityId || employee.branchId !== session.branchId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Unauthorized to view this user' },
          { status: 403 }
        );
      }
    }

    // Return safe employee data
    const safeEmployee = toSafeEmployee(employee);

    return NextResponse.json<ApiResponse<SafeEmployee>>({
      success: true,
      data: safeEmployee,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH: Update user
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const employee = getEmployeeById(userId);

    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Admin can only update users in their entity/branch
    if (session.role === 'admin') {
      if (employee.entityId !== session.entityId || employee.branchId !== session.branchId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Unauthorized to update this user' },
          { status: 403 }
        );
      }
    }

    const body = await request.json() as UpdateEmployeeInput & { pageAccess?: PageAccess };

    // Admin cannot change role or status
    if (session.role === 'admin' && (body.role || body.status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Admins cannot change user role or status' },
        { status: 403 }
      );
    }

    // Only super admin can change entity/branch or page access
    if (!isSuperAdmin(session) && (body.entityId !== undefined || body.branchId !== undefined || body.pageAccess !== undefined)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only super admin can change entity/branch or page access' },
        { status: 403 }
      );
    }

    // Hash password if provided
    if (body.password) {
      body.password = await hashPassword(body.password);
    }

    const updatedEmployee = updateEmployee(userId, body);

    if (!updatedEmployee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return safe employee data
    const safeEmployee = toSafeEmployee(updatedEmployee);

    return NextResponse.json<ApiResponse<SafeEmployee>>({
      success: true,
      data: safeEmployee,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE: Delete user (super admin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || !isSuperAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized - Super admin only' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (userId === session.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const success = deleteEmployee(userId);

    if (!success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

