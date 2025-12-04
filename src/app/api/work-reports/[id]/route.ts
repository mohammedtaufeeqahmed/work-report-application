import { NextRequest, NextResponse } from 'next/server';
import { getWorkReportById, updateWorkReport, getEditPermissions, getManagerDepartments } from '@/lib/db/queries';
import { getSession } from '@/lib/auth';
import type { ApiResponse, WorkReport, UpdateWorkReportInput } from '@/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Get a single work report by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const report = getWorkReportById(reportId);

    if (!report) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check access: employees can only view their own, managers can view their department
    const canViewAll = session.role === 'admin' || session.role === 'superadmin';
    const isManager = session.role === 'manager';
    const isOwnReport = report.employeeId === session.employeeId;
    const isSameDepartment = report.department === session.department;

    if (!canViewAll && !isOwnReport && !(isManager && isSameDepartment)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json<ApiResponse<WorkReport>>({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Get work report error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch work report' },
      { status: 500 }
    );
  }
}

// PUT: Update a work report
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const report = getWorkReportById(reportId);

    if (!report) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get edit permissions from settings
    const permissions = getEditPermissions();
    
    // Check edit permissions based on role and settings
    const isOwnReport = report.employeeId === session.employeeId;
    
    let canEdit = false;
    
    if (session.role === 'superadmin') {
      canEdit = permissions.superadmin_can_edit_reports;
    } else if (session.role === 'admin') {
      canEdit = permissions.admin_can_edit_reports;
    } else if (session.role === 'employee') {
      // Employees can only edit their own reports if permission is enabled
      canEdit = isOwnReport && permissions.employee_can_edit_own_reports;
    }
    // Managers cannot edit reports - removed

    if (!canEdit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You do not have permission to edit this report' },
        { status: 403 }
      );
    }

    // Parse the request body
    const body: UpdateWorkReportInput = await request.json();
    const { status, workReport, onDuty } = body;

    // Validate status if provided
    if (status && status !== 'working' && status !== 'leave') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid status. Must be "working" or "leave"' },
        { status: 400 }
      );
    }

    // If status is working, work report is required
    const newStatus = status || report.status;
    const newWorkReport = workReport !== undefined ? workReport : report.workReport;
    // onDuty is only applicable when status is working
    const newOnDuty = newStatus === 'working' ? (onDuty !== undefined ? onDuty : report.onDuty) : false;

    if (newStatus === 'working' && (!newWorkReport || newWorkReport.trim() === '')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Work report is required when status is "working"' },
        { status: 400 }
      );
    }

    // Update the report
    const updatedReport = updateWorkReport(reportId, newStatus, newWorkReport, newOnDuty);

    if (!updatedReport) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkReport>>({
      success: true,
      data: updatedReport,
      message: 'Work report updated successfully',
    });
  } catch (error) {
    console.error('Update work report error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update work report' },
      { status: 500 }
    );
  }
}

