import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { ApiResponse, SessionUser } from '@/types';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Not authenticated',
      }, { status: 401 });
    }

    return NextResponse.json<ApiResponse<SessionUser>>({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'An error occurred while fetching session',
      },
      { status: 500 }
    );
  }
}

