import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getManagerDepartments } from '@/lib/db/queries';
import type { ApiResponse, Department } from '@/types';

// GET: Get departments for the current manager
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can access this endpoint
    if (session.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only managers can access this endpoint' },
        { status: 403 }
      );
    }

    const departments = await getManagerDepartments(session.id);

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

