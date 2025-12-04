import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that require authentication
const protectedRoutes = [
  '/admin',
  '/super-admin',
  '/management-dashboard',
  '/managers-dashboard',
  '/employee-reports',
  '/employee-dashboard',
];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Routes that require superadmin role
const superAdminRoutes = ['/super-admin'];

// Routes accessible by board members
const boardMemberRoutes = ['/management-dashboard'];

// Get JWT secret
function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-development';
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isSuperAdminRoute = superAdminRoutes.some(route => pathname.startsWith(route));
  const isBoardMemberRoute = boardMemberRoutes.some(route => pathname.startsWith(route));

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const token = request.cookies.get('session')?.value;

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    // Check if user is active
    if (payload.status !== 'active') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'Account deactivated');
      return NextResponse.redirect(loginUrl);
    }

    // Check admin routes
    if (isAdminRoute && payload.role !== 'admin' && payload.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check superadmin routes
    if (isSuperAdminRoute && payload.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Board members can only access board member routes
    if (payload.role === 'boardmember') {
      if (isBoardMemberRoute) {
        return NextResponse.next();
      }
      // Redirect board members to management dashboard if they try to access other protected routes
      return NextResponse.redirect(new URL('/management-dashboard', request.url));
    }

    // Allow access
    return NextResponse.next();
  } catch {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

