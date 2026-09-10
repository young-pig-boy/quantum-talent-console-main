import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LOCAL_ACCESS_COOKIE } from '@/server/local-access/config';

/**
 * POST /api/auth/logout
 *
 * Dual-session logout:
 *   1. Always clear the break-glass cookie (quantum_console_access)
 *   2. Best-effort Supabase Auth signOut (for team accounts)
 *
 * This ensures both auth paths are cleanly terminated.
 */
export async function POST() {
  const response = NextResponse.json({ success: true, data: null });

  // 1. Clear break-glass cookie
  response.cookies.set(LOCAL_ACCESS_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  // 2. Best-effort Supabase Auth signOut (for team accounts)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies();
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      await supabase.auth.signOut();
    }
  } catch {
    // Best-effort — Supabase signOut failure does not block logout
  }

  return response;
}
