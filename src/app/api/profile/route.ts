import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getEmployeeByEmployeeId, 
  getEntityById, 
  getBranchById,
  getManagersForDepartment
} from '@/lib/db/queries';
import type { ApiResponse } from '@/types';

export interface ProfileData {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  entity: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  managers: { id: number; employeeId: string; name: string; email: string }[];
  createdAt: string;
}

// GET: Get current user's profile with hierarchy
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const employee = getEmployeeByEmployeeId(session.employeeId);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get entity and branch info
    let entity = null;
    let branch = null;
    
    if (employee.entityId) {
      const entityData = getEntityById(employee.entityId);
      if (entityData) {
        entity = { id: entityData.id, name: entityData.name };
      }
    }
    
    if (employee.branchId) {
      const branchData = getBranchById(employee.branchId);
      if (branchData) {
        branch = { id: branchData.id, name: branchData.name };
      }
    }

    // Get managers for this department
    const managers = getManagersForDepartment(employee.department);

    const profileData: ProfileData = {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      status: employee.status,
      entity,
      branch,
      managers: managers.map(m => ({
        id: m.id,
        employeeId: m.employeeId,
        name: m.name,
        email: m.email,
      })),
      createdAt: employee.createdAt,
    };

    return NextResponse.json<ApiResponse<ProfileData>>({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

