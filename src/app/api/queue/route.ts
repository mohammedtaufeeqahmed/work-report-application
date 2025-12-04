import { NextResponse } from 'next/server';
import { getQueueStatus } from '@/lib/queue/work-report-queue';
import { isGoogleSheetsConfigured } from '@/lib/google-sheets';
import type { ApiResponse } from '@/types';

// GET: Get queue status (for monitoring)
export async function GET() {
  try {
    const status = getQueueStatus();
    const googleSheetsEnabled = isGoogleSheetsConfigured();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        queue: status,
        googleSheetsBackup: googleSheetsEnabled ? 'enabled' : 'disabled',
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

