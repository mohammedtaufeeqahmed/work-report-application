import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { canMarkHolidays } from '@/lib/permissions';
import { getHolidayById, deleteHoliday, updateHoliday } from '@/lib/db/queries';
import { logger } from '@/lib/logger';
import type { ApiResponse, Holiday } from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Get holiday by ID
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
    const holidayId = parseInt(id);

    if (isNaN(holidayId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid holiday ID' },
        { status: 400 }
      );
    }

    const holiday = await getHolidayById(holidayId);

    if (!holiday) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Holiday>>({
      success: true,
      data: holiday,
    });
  } catch (error) {
    logger.error('Get holiday error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch holiday' },
      { status: 500 }
    );
  }
}

// PUT: Update a holiday
export async function PUT(
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

    // Check permission
    if (!canMarkHolidays(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have permission to update holidays' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const holidayId = parseInt(id);

    if (isNaN(holidayId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid holiday ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Check if holiday exists
    const existingHoliday = await getHolidayById(holidayId);
    if (!existingHoliday) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    // Update holiday
    const updatedHoliday = await updateHoliday(holidayId, name || null);

    return NextResponse.json<ApiResponse<Holiday>>({
      success: true,
      data: updatedHoliday,
      message: 'Holiday updated successfully',
    });
  } catch (error) {
    logger.error('Update holiday error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a holiday
export async function DELETE(
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

    // Check permission
    if (!canMarkHolidays(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have permission to delete holidays' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const holidayId = parseInt(id);

    if (isNaN(holidayId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid holiday ID' },
        { status: 400 }
      );
    }

    // Check if holiday exists
    const existingHoliday = await getHolidayById(holidayId);
    if (!existingHoliday) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    // Check if user is creator or super admin
    if (existingHoliday.createdBy !== session.id && session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You can only delete holidays you created' },
        { status: 403 }
      );
    }

    // Delete holiday
    const deleted = await deleteHoliday(holidayId);

    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to delete holiday' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    logger.error('Delete holiday error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}

