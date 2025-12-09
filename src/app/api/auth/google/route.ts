import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Get JWT secret for state token
function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured. Set NEXTAUTH_SECRET or JWT_SECRET in environment variables.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a state token for CSRF protection
 */
async function generateStateToken(): Promise<string> {
  const secret = getJwtSecret();
  const state = crypto.randomUUID();
  
  const token = await new SignJWT({ state })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m') // State expires in 5 minutes
    .sign(secret);
  
  return token;
}

/**
 * GET: Initiate Google OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID is not configured');
      return NextResponse.json(
        { success: false, error: 'Google OAuth is not configured' },
        { status: 500 }
      );
    }

    // Generate state token for CSRF protection
    const stateToken = await generateStateToken();
    
    // Get callback URL from query params or use default
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '';
    
    // Build Google OAuth URL
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const scope = 'openid email profile';
    const responseType = 'code';
    
    // Note: We don't use the 'hd' parameter since it only works for a single domain
    // Domain validation will happen in the callback handler
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', responseType);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', stateToken);
    
    // Store callback URL in state if provided
    if (callbackUrl) {
      authUrl.searchParams.set('callbackUrl', callbackUrl);
    }

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/login?error=OAuth+initialization+failed', request.url)
    );
  }
}

