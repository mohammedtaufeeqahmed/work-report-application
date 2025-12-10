import { NextResponse } from 'next/server';
import { getEditPermissions } from '@/lib/db/queries';
import { getSession } from '@/lib/auth';
import type { ApiResponse, EditPermissions } from '@/types';

// GET: Get edit permissions for current user context
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const permissions = await getEditPermissions();

    // Return permissions relevant to the user's role
    return NextResponse.json<ApiResponse<EditPermissions>>({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
