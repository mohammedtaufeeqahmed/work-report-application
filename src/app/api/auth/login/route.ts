import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, setSessionCookie, employeeToSessionUser } from '@/lib/auth';
import type { LoginCredentials, ApiResponse, SafeEmployee } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    const { employeeId, password } = body;

    // Validate input
    if (!employeeId || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Employee ID and password are required',
        },
        { status: 400 }
      );
    }

    // Authenticate user
    const result = await authenticateUser({ employeeId, password });

    if (!result.success || !result.user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: result.error || 'Authentication failed',
        },
        { status: 401 }
      );
    }

    // Create session
    const sessionUser = employeeToSessionUser(result.user);
    await setSessionCookie(sessionUser);

    // Return user data (without password)
    const safeUser: SafeEmployee = {
      id: result.user.id,
      employeeId: result.user.employeeId,
      name: result.user.name,
      email: result.user.email,
      department: result.user.department,
      entityId: result.user.entityId,
      branchId: result.user.branchId,
      role: result.user.role,
      status: result.user.status,
      createdBy: result.user.createdBy,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    };

    return NextResponse.json<ApiResponse<SafeEmployee>>({
      success: true,
      data: safeUser,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'An error occurred during login',
      },
      { status: 500 }
    );
  }
}

