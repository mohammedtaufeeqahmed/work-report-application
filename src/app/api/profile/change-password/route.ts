import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, clearSession } from '@/lib/auth';
import { 
  getEmployeeByEmployeeId, 
  getOTPToken, 
  deleteOTPTokensForEmployee,
  updateEmployeePassword 
} from '@/lib/db/queries';
import type { ApiResponse } from '@/types';

interface ChangePasswordInput {
  otp: string;
  newPassword: string;
}

// POST: Verify OTP and change password
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: ChangePasswordInput = await request.json();
    const { otp, newPassword } = body;

    // Validate input
    if (!otp || !newPassword) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'OTP and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const employee = getEmployeeByEmployeeId(session.employeeId);
    if (!employee) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify OTP
    const otpToken = getOTPToken(employee.employeeId, otp);
    
    if (!otpToken) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date(otpToken.expiresAt) < new Date()) {
      deleteOTPTokensForEmployee(employee.employeeId);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const updated = updateEmployeePassword(employee.employeeId, hashedPassword);

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Delete used OTP tokens
    deleteOTPTokensForEmployee(employee.employeeId);

    // Clear the session to force re-login with new password
    await clearSession();

    return NextResponse.json<ApiResponse<{ logout: boolean }>>({
      success: true,
      message: 'Password changed successfully. Please login with your new password.',
      data: { logout: true },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}

