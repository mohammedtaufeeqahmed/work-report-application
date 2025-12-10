import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, isAdmin } from '@/lib/auth';
import { 
  getAllEmployees, 
  getEmployeesByEntity, 
  getEmployeesByBranch,
  createEmployee,
  getEmployeeByEmployeeId,
  getEmployeeByEmail
} from '@/lib/db/queries';
import type { ApiResponse, SafeEmployee, CreateEmployeeInput, PageAccess, Employee } from '@/types';

// Helper to convert Employee to SafeEmployee with parsed pageAccess
function toSafeEmployee(emp: Employee): SafeEmployee {
  let parsedPageAccess: PageAccess | null = null;
  if (emp.pageAccess) {
    try {
      parsedPageAccess = JSON.parse(emp.pageAccess);
    } catch {
      parsedPageAccess = null;
    }
  }
  return {
    id: emp.id,
    employeeId: emp.employeeId,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    entityId: emp.entityId,
    branchId: emp.branchId,
    role: emp.role,
    status: emp.status,
    pageAccess: parsedPageAccess,
    createdBy: emp.createdBy,
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

// GET: Get all users (filtered by admin's scope)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let rawEmployees: Employee[];

    // Super admin can see all users
    if (session.role === 'superadmin') {
      rawEmployees = await getAllEmployees() as unknown as Employee[];
    } else {
      // Admin can only see users in their entity/branch
      if (session.branchId) {
        rawEmployees = await getEmployeesByBranch(session.branchId) as unknown as Employee[];
      } else if (session.entityId) {
        rawEmployees = await getEmployeesByEntity(session.entityId) as unknown as Employee[];
      } else {
        rawEmployees = [];
      }
    }

    // Convert to SafeEmployee with parsed pageAccess
    const employees = rawEmployees.map(toSafeEmployee);

    return NextResponse.json<ApiResponse<SafeEmployee[]>>({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { employeeId, name, email, department, password, entityId, branchId, role, pageAccess } = body as CreateEmployeeInput & { pageAccess?: PageAccess };

    // Validate required fields
    if (!employeeId || !name || !email || !department || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role - admins can create employees and managers, only superadmins can create admins
    if (session.role === 'admin' && role && (role === 'admin' || role === 'superadmin')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only superadmins can create admin users' },
        { status: 403 }
      );
    }

    // Admin can only create users in their entity/branch
    if (session.role === 'admin') {
      if (entityId && entityId !== session.entityId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'You can only create users in your assigned entity' },
          { status: 403 }
        );
      }
      if (branchId && branchId !== session.branchId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'You can only create users in your assigned branch' },
          { status: 403 }
        );
      }
    }

    // Check if employee ID already exists
    const existingById = await getEmployeeByEmployeeId(employeeId);
    if (existingById) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Employee ID already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingByEmail = await getEmployeeByEmail(email);
    if (existingByEmail) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userRole = role ?? 'employee';
    const newEmployee = await createEmployee({
      employeeId,
      name,
      email,
      department,
      password: hashedPassword,
      entityId: entityId ?? (session.role === 'admin' ? session.entityId : null),
      branchId: branchId ?? (session.role === 'admin' ? session.branchId : null),
      role: userRole,
      pageAccess: pageAccess ?? null, // Use provided pageAccess or null (will use defaults)
      createdBy: session.id,
    });

    // Return safe employee data
    const safeEmployee = toSafeEmployee(newEmployee);

    return NextResponse.json<ApiResponse<SafeEmployee>>({
      success: true,
      data: safeEmployee,
      message: 'User created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
