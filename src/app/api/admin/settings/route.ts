import { NextRequest, NextResponse } from 'next/server';
import { getEditPermissions, updateEditPermissions } from '@/lib/db/queries';
import { getSession } from '@/lib/auth';
import type { ApiResponse, EditPermissions } from '@/types';

// GET: Get edit permissions settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin can view settings
    if (session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only super admin can access settings' },
        { status: 403 }
      );
    }

    const permissions = await getEditPermissions();

    return NextResponse.json<ApiResponse<EditPermissions>>({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT: Update edit permissions settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin can update settings
    if (session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only super admin can update settings' },
        { status: 403 }
      );
    }

    const body: Partial<EditPermissions> = await request.json();
    const updatedPermissions = await updateEditPermissions(body);

    return NextResponse.json<ApiResponse<EditPermissions>>({
      success: true,
      data: updatedPermissions,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
