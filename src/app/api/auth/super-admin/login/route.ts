import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/server/local-access/password';
import { generateAccessTokenAsync } from '@/server/local-access/token';
import {
  LOCAL_ACCESS_COOKIE,
  getSuperAdminUsername,
  getSuperAdminPasswordHash,
  getConfiguredActorId,
  getBreakGlassSessionTtl,
} from '@/server/local-access/config';

/**
 * POST /api/auth/super-admin/login
 *
 * Break-glass Super Admin login — completely independent of Supabase Auth.
 *
 * Flow:
 *   1. Validate username against configured super admin username
 *   2. Verify password against scrypt hash (from env)
 *   3. Generate signed HMAC access token with configured actor ID
 *   4. Set quantum_console_access HttpOnly cookie
 *   5. Return success with break-glass identity
 *
 * Zero Supabase dependency — no profiles query, no auth.users, no RPC.
 */
export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '账号或密码错误' },
      { status: 401 },
    );
  }

  const { username, password } = body;

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username.trim() ||
    !password
  ) {
    return NextResponse.json(
      { success: false, error: '请输入账号和密码' },
      { status: 400 },
    );
  }

  // Step 1: Verify username
  const expectedUsername = getSuperAdminUsername();
  if (username.trim() !== expectedUsername) {
    return NextResponse.json(
      { success: false, error: '账号或密码错误' },
      { status: 401 },
    );
  }

  // Step 2: Verify password against scrypt hash
  const passwordHash = getSuperAdminPasswordHash();
  if (!passwordHash) {
    return NextResponse.json(
      { success: false, error: '认证服务未配置' },
      { status: 500 },
    );
  }

  if (!verifyPassword(password, passwordHash)) {
    return NextResponse.json(
      { success: false, error: '账号或密码错误' },
      { status: 401 },
    );
  }

  // Step 3: Generate signed access token with configured actor ID
  // No Supabase query — the actor ID comes from env config (break-glass identity)
  const actorId = getConfiguredActorId();
  const ttl = getBreakGlassSessionTtl();
  const token = await generateAccessTokenAsync(actorId, ttl);

  // Step 4: Set HttpOnly cookie and return success
  const response = NextResponse.json({
    success: true,
    data: {
      role: 'super_admin' as const,
      is_break_glass: true,
    },
  });

  response.cookies.set(LOCAL_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttl,
  });

  return response;
}
