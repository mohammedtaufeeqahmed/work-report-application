import { NextRequest, NextResponse } from 'next/server';
import { enqueueWorkReport, getQueueItemStatus } from '@/lib/queue/work-report-queue';
import { getWorkReportByEmployeeAndDate } from '@/lib/db/queries';
import type { ApiResponse, CreateWorkReportInput } from '@/types';

// POST: Submit a work report via queue (for concurrent submissions)
export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkReportInput = await request.json();
    const { employeeId, date, name, email, department, status, workReport, onDuty } = body;

    // Validate required fields
    if (!employeeId || !date || !name || !email || !department || !status) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate status
    if (status !== 'working' && status !== 'leave') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid status. Must be "working" or "leave"' },
        { status: 400 }
      );
    }

    // If working, work report is mandatory
    if (status === 'working' && (!workReport || workReport.trim() === '')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Work report is required when status is "working"' },
        { status: 400 }
      );
    }

    // Check if employee already submitted a report for this date
    const existingReport = getWorkReportByEmployeeAndDate(employeeId, date);
    if (existingReport) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'You have already submitted a work report for today' },
        { status: 409 } // 409 Conflict
      );
    }

    // Enqueue the work report (returns immediately)
    const queueId = enqueueWorkReport({
      employeeId,
      date,
      name,
      email,
      department,
      status,
      workReport: workReport || null,
      onDuty: status === 'working' ? (onDuty || false) : false,
    });

    // Return success with queue ID
    return NextResponse.json<ApiResponse<{ queueId: string }>>({
      success: true,
      data: { queueId },
      message: 'Work report queued for processing',
    }, { status: 202 }); // 202 Accepted - request accepted for processing
  } catch (error) {
    console.error('Queue work report error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to queue work report' },
      { status: 500 }
    );
  }
}

// GET: Check status of a queued item
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queueId = url.searchParams.get('id');

    if (!queueId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    const item = getQueueItemStatus(queueId);

    if (!item) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Queue item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: item.id,
        status: item.status,
        error: item.error,
        result: item.result,
        timestamp: item.timestamp,
        retries: item.retries,
      },
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

