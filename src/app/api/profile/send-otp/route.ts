import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmployeeByEmployeeId, createOTPToken, deleteOTPTokensForEmployee } from '@/lib/db/queries';
import { generateOTP, sendOTPEmail } from '@/lib/email';
import type { ApiResponse } from '@/types';

// POST: Send OTP to user's email for password change
export async function POST() {
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

    // Delete any existing OTP tokens for this user
    deleteOTPTokensForEmployee(employee.employeeId);

    // Generate new OTP
    const otp = generateOTP();
    
    // Store OTP in database (expires in 10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    createOTPToken(employee.employeeId, otp, expiresAt);

    // Send OTP via email
    const emailSent = await sendOTPEmail(employee.email, otp, employee.name);
    
    if (!emailSent) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    // Mask email for response
    const maskedEmail = employee.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    return NextResponse.json<ApiResponse<{ email: string }>>({
      success: true,
      data: { email: maskedEmail },
      message: `OTP sent to ${maskedEmail}`,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

