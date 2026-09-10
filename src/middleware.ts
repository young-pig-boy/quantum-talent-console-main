import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyAccessToken } from '@/server/local-access/token';

const LOGIN_PATH = '/login';
const LOCAL_ACCESS_COOKIE = 'quantum_console_access';

/**
 * Paths that do not require authentication.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === LOGIN_PATH) return true;
  if (pathname.startsWith('/api/auth') && pathname !== '/api/auth/me') return true;
  if (pathname.startsWith('/api/public')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)) return true;
  return false;
}

/**
 * Internal write API paths that require authentication (401 for anonymous).
 * Read APIs (GET) are lenient for backward compatibility.
 */
function isProtectedWriteApi(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/api/public')) return false;
  if (pathname.startsWith('/api/auth')) return false;
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

/**
 * Check if the request has a valid break-glass Super Admin cookie.
 * Verifies the HMAC signature and expiry of the token.
 */
async function hasValidBreakGlass(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(LOCAL_ACCESS_COOKIE);
  if (!cookie?.value) return false;
  const actorId = await verifyAccessToken(cookie.value);
  return actorId !== null;
}

/**
 * Middleware — dual auth path support.
 *
 * 1. Local Super Admin cookie (break-glass) — checked first
 * 2. Supabase Auth session — refreshed on every request
 *
 * If neither is valid:
 * - Page requests → redirect to /login
 * - Write API requests → return 401
 * - Read API requests → pass through (lenient)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — pass through
  if (isPublicPath(pathname)) {
    // If already logged in (either path), redirect away from /login
    if (pathname === LOGIN_PATH) {
      if (await hasValidBreakGlass(request)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      // Also check Supabase Auth cookies
      const allCookies = request.cookies.getAll();
      const hasSupabaseAuth = allCookies.some(c => c.name.includes('auth-token') && c.value);
      if (hasSupabaseAuth) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check break-glass Super Admin cookie first
  if (await hasValidBreakGlass(request)) {
    return NextResponse.next();
  }

  // Try Supabase Auth session refresh
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return supabaseResponse;
    }
  }

  // Not authenticated via either path
  // Protected write API → 401
  if (isProtectedWriteApi(pathname, request.method)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  // Page request → redirect to login
  if (!pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // Read API → pass through (lenient)
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
