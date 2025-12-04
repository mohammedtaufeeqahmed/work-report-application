import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getDepartmentById, 
  updateDepartment, 
  deleteDepartment,
  getDepartmentByName 
} from '@/lib/db/queries';
import type { ApiResponse, Department } from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Get a single department
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
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const department = getDepartmentById(departmentId);

    if (!department) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Department>>({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('Get department error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch department' },
      { status: 500 }
    );
  }
}

// PATCH: Update a department (superadmin only)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only superadmins can update departments' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const existing = getDepartmentById(departmentId);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Check if new name already exists (excluding current department)
    const nameExists = getDepartmentByName(name.trim());
    if (nameExists && nameExists.id !== departmentId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Department name already exists' },
        { status: 409 }
      );
    }

    const department = updateDepartment(departmentId, name.trim());

    return NextResponse.json<ApiResponse<Department>>({
      success: true,
      data: department!,
      message: 'Department updated successfully',
    });
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a department (superadmin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only superadmins can delete departments' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid department ID' },
        { status: 400 }
      );
    }

    const existing = getDepartmentById(departmentId);
    if (!existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    deleteDepartment(departmentId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}

