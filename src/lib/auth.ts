import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getEmployeeByEmployeeId, updateEmployeePassword } from './db/queries';
import type { Employee, SessionUser, LoginCredentials, PageAccess } from '@/types';
import { DEFAULT_PAGE_ACCESS } from '@/types';

// Constants
const SALT_ROUNDS = 10;
const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY_DAYS = 7;

// Get JWT secret from environment
function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured. Set NEXTAUTH_SECRET or JWT_SECRET in environment variables.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a session token (JWT)
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const secret = getJwtSecret();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const token = await new SignJWT({
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    department: user.department,
    role: user.role,
    status: user.status,
    entityId: user.entityId,
    branchId: user.branchId,
    pageAccess: user.pageAccess,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return token;
}

/**
 * Verify a session token and return the user data
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    
    return {
      id: payload.id as number,
      employeeId: payload.employeeId as string,
      name: payload.name as string,
      email: payload.email as string,
      department: payload.department as string,
      role: payload.role as SessionUser['role'],
      status: payload.status as SessionUser['status'],
      entityId: payload.entityId as number | null,
      branchId: payload.branchId as number | null,
      pageAccess: payload.pageAccess as PageAccess | null,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate a user with credentials
 */
export async function authenticateUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: Employee; error?: string }> {
  const { employeeId, password } = credentials;

  // Get employee from database
  const employee = await getEmployeeByEmployeeId(employeeId);
  
  if (!employee) {
    return { success: false, error: 'Invalid employee ID or password' };
  }

  // Check if employee is active
  if (employee.status !== 'active') {
    return { success: false, error: 'Your account has been deactivated. Please contact administrator.' };
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, employee.password);
  
  if (!isValidPassword) {
    return { success: false, error: 'Invalid employee ID or password' };
  }

  return { success: true, user: employee };
}

/**
 * Set session cookie
 */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  // Use secure cookies when running over HTTPS (production with Cloudflare)
  // Check if we're in production and using HTTPS
  const isSecure = process.env.NODE_ENV === 'production' || 
                   process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }

  const user = await verifySessionToken(token);
  
  // If token is valid but user is deactivated, clear session
  if (user && user.status !== 'active') {
    await clearSession();
    return null;
  }

  return user;
}

/**
 * Clear session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user has required role
 */
export function hasRole(user: SessionUser | null, requiredRoles: SessionUser['role'][]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Check if user is admin or superadmin
 */
export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ['admin', 'superadmin']);
}

/**
 * Check if user is superadmin
 */
export function isSuperAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ['superadmin']);
}

/**
 * Change password for a user
 */
export async function changePassword(employeeId: string, newPassword: string): Promise<boolean> {
  const hashedPassword = await hashPassword(newPassword);
  return updateEmployeePassword(employeeId, hashedPassword);
}

/**
 * Convert Employee to SessionUser (removes sensitive data)
 */
export function employeeToSessionUser(employee: Employee): SessionUser {
  // Parse pageAccess from JSON string or use default based on role
  let pageAccess: PageAccess | null = null;
  if (employee.pageAccess) {
    try {
      pageAccess = JSON.parse(employee.pageAccess) as PageAccess;
    } catch {
      pageAccess = DEFAULT_PAGE_ACCESS[employee.role];
    }
  } else {
    pageAccess = DEFAULT_PAGE_ACCESS[employee.role];
  }

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    role: employee.role,
    status: employee.status,
    entityId: employee.entityId,
    branchId: employee.branchId,
    pageAccess,
  };
}
