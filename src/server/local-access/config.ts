/**
 * Local Console Access — Configuration & Constants
 *
 * This module defines the local super-admin identity that is used by the
 * console access gate. Supabase Auth is completely out of the picture for
 * console login — it only serves as the business database.
 */

import type { Profile } from '@/lib/domain/types';

/** Fixed super-admin username — hardcoded and never exposed to client bundle */
export const LOCAL_SUPER_ADMIN_USERNAME = 'chaojiguanliyuan-jiachi-liangzikeji';

/** Resolve the Super Admin username from server env, falling back to the dev default. */
export function getSuperAdminUsername(): string {
  return process.env.SUPER_ADMIN_USERNAME || LOCAL_SUPER_ADMIN_USERNAME;
}

/**
 * Legacy fallback actor ID. DO NOT use this for real database writes.
 * It does not exist in the profiles table and will cause RPC failures.
 */
export const LOCAL_SUPER_ADMIN_ACTOR_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Runtime actor ID for the local access gate.
 *
 * Priority:
 *   1. CONSOLE_ACTOR_ID env var (explicit real profile UUID)
 *   2. SUPER_ADMIN_ACTOR_ID env var (legacy alias)
 *   3. LOCAL_SUPER_ADMIN_ACTOR_ID fallback (development only — not valid in DB)
 */
export function getConfiguredActorId(): string {
  return (
    process.env.CONSOLE_ACTOR_ID ||
    process.env.SUPER_ADMIN_ACTOR_ID ||
    LOCAL_SUPER_ADMIN_ACTOR_ID
  );
}

/** HttpOnly cookie name for the local access token */
export const LOCAL_ACCESS_COOKIE = 'quantum_console_access';

/** Break-glass session lifetime (seconds). Defaults to 24 hours. */
export const BREAK_GLASS_SESSION_TTL_SECONDS = 60 * 60 * 24;

/** Resolve the break-glass session TTL from server env, falling back to the default. */
export function getBreakGlassSessionTtl(): number {
  const raw = process.env.BREAK_GLASS_SESSION_TTL_SECONDS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return BREAK_GLASS_SESSION_TTL_SECONDS;
}

/** HMAC signing secret for access tokens */
export function getLocalAccessSecret(): string {
  return (
    process.env.LOCAL_ACCESS_SECRET ||
    // Development-only fallback — production MUST set LOCAL_ACCESS_SECRET
    'quantum-console-local-access-dev-secret-2025'
  );
}

/** Pre-computed scrypt hash of the super-admin password */
export function getSuperAdminPasswordHash(): string {
  return (
    process.env.SUPER_ADMIN_PASSWORD_HASH ||
    process.env.LOCAL_SUPER_ADMIN_PASSWORD_HASH ||
    // Development-only default. Production MUST set LOCAL_SUPER_ADMIN_PASSWORD_HASH.
    // This default hash corresponds to password: jiachi-AITM-console
    // Generate a new hash with: node -e "const {hashPassword}=require('./password'); console.log(hashPassword('YOUR_PASSWORD'))"
    'scrypt:PmdwX_3rJshM_I7bXqGcBxBwWHeJ3UJamQ8XBhfxd5w:u2dykJX68uT7eyocG3-qgPNiqgEO2l9o8po0-4rlUojbkQgku3UrsTOnUsJfX9uA7oEOCfup0Olk0ji8dyP0Qg'
  );
}

/**
 * The break-glass super-admin actor identity.
 *
 * This is the source of truth for a Super Admin authenticated via the local
 * break-glass session. It is intentionally NOT resolved from Supabase
 * profiles — the break-glass identity exists independently of the database.
 */
export const LOCAL_SUPER_ADMIN_PROFILE: Profile = {
  id: getConfiguredActorId(),
  full_name: '超级管理员',
  role: 'super_admin',
  status: 'active',
  manager_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * Check if the current request has a valid local access cookie value.
 * This is a pure function — callers pass in the cookie value and the
 * token verifier to avoid circular imports.
 */
export function hasLocalConsoleAccess(
  cookieValue: string | undefined,
  verifyFn: (token: string) => string | null,
): boolean {
  if (!cookieValue) return false;
  try {
    return verifyFn(cookieValue) !== null;
  } catch {
    return false;
  }
}
