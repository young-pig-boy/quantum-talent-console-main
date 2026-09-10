import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { AuthError, ForbiddenError } from '@/lib/domain/errors';
import type { ActorContext, InternalRole, Profile } from '@/lib/domain/types';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import {
  LOCAL_ACCESS_COOKIE,
  LOCAL_SUPER_ADMIN_PROFILE,
} from '@/server/local-access/config';
import { verifyAccessToken } from '@/server/local-access/token';
import { buildActorContext } from '@/server/auth/actor';
import { checkPermission } from '@/server/auth/permissions';
import type { PermissionKey } from '@/lib/domain/types';

async function fetchProfile(actorId: string): Promise<Profile | null> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, manager_id, created_at, updated_at')
      .eq('id', actorId)
      .single();
    if (!data) return null;
    return {
      id: data.id,
      full_name: data.full_name,
      role: data.role as InternalRole,
      status: data.status,
      manager_id: data.manager_id ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Read the local access cookie and verify its token.
 * Returns the actor ID if valid, null otherwise.
 */
async function readAndVerifyLocalCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(LOCAL_ACCESS_COOKIE);
    if (!cookie?.value) return null;
    return await verifyAccessToken(cookie.value);
  } catch {
    return null;
  }
}

/**
 * Read Supabase Auth session from SSR cookies.
 * Returns the user ID if valid, null otherwise.
 */
async function readSupabaseAuthSession(): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return null;

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // We're just reading the session, not setting cookies
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Verify the user exists in profiles and is active
    const profile = await fetchProfile(user.id);
    if (!profile || profile.status !== 'active') return null;

    return user.id;
  } catch {
    return null;
  }
}

/**
 * Resolve the current actor ID from either auth path.
 * Priority: local cookie (break-glass) > Supabase Auth session.
 */
async function resolveActorId(): Promise<{ actorId: string; isBreakGlass: boolean } | null> {
  // Try local cookie first (break-glass Super Admin)
  const localActorId = await readAndVerifyLocalCookie();
  if (localActorId) {
    return { actorId: localActorId, isBreakGlass: true };
  }

  // Try Supabase Auth session
  const supabaseUserId = await readSupabaseAuthSession();
  if (supabaseUserId) {
    return { actorId: supabaseUserId, isBreakGlass: false };
  }

  return null;
}

/**
 * Get the current authenticated user's profile.
 * Returns null if not authenticated.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const result = await resolveActorId();
  if (!result) return null;
  // Break-glass: return synthetic profile without Supabase query
  if (result.isBreakGlass) return LOCAL_SUPER_ADMIN_PROFILE;
  return (await fetchProfile(result.actorId)) ?? LOCAL_SUPER_ADMIN_PROFILE;
}

/**
 * Require authentication via either local cookie or Supabase Auth.
 *
 * THROWS AuthError(401) if neither auth path is valid.
 *
 * @returns The real Profile (never null — throws on failure)
 */
export async function requireAuth(): Promise<Profile> {
  const result = await resolveActorId();

  if (!result) {
    throw new AuthError('Authentication required', 401);
  }

  // Break-glass: return synthetic profile without Supabase query
  if (result.isBreakGlass) {
    return LOCAL_SUPER_ADMIN_PROFILE;
  }

  const profile = await fetchProfile(result.actorId);
  if (!profile) {
    throw new AuthError('身份已失效，请重新登录', 401);
  }

  if (profile.status !== 'active') {
    throw new AuthError('账号已被停用', 403);
  }

  return profile;
}

/**
 * Resolve the current actor ID from either auth path.
 * Returns the real profile UUID, or null if not authenticated.
 */
export async function resolveCurrentActor(): Promise<string | null> {
  const result = await resolveActorId();
  return result?.actorId ?? null;
}

/**
 * Resolve the current actor with full profile context.
 * Returns the real Profile from the database, or null if not authenticated.
 */
export async function resolveCurrentActorProfile(): Promise<Profile | null> {
  const result = await resolveActorId();
  if (!result) return null;
  // Break-glass: return synthetic profile without Supabase query
  if (result.isBreakGlass) return LOCAL_SUPER_ADMIN_PROFILE;
  return fetchProfile(result.actorId);
}

/**
 * Resolve the full ActorContext for the current request.
 * Includes profile, teams, and effective permissions.
 * Returns null if not authenticated.
 */
export async function resolveActorContext(): Promise<ActorContext | null> {
  const result = await resolveActorId();
  if (!result) return null;
  return buildActorContext(result.actorId, result.isBreakGlass);
}

/**
 * Require authentication AND a specific permission.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if authenticated but lacks the permission.
 *
 * @returns The ActorContext (never null — throws on failure)
 */
export async function requirePermission(permission: PermissionKey): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.status !== 'active') {
    throw new AuthError('账号已被停用', 403);
  }

  // Break-glass super_admin: all permissions granted without DB check
  if (ctx.is_break_glass && ctx.profile.role === 'super_admin') {
    return ctx;
  }

  // Check permission
  const has = await checkPermission(ctx.profile.id, ctx.profile.role, permission);
  if (!has) {
    throw new ForbiddenError('NO_PERMISSION', '没有执行此操作的权限');
  }

  return ctx;
}

/**
 * Require authentication AND super_admin role.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if not super_admin.
 */
export async function requireSuperAdmin(): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    throw new ForbiddenError('REQUIRES_SUPER_ADMIN', '此操作仅限超级管理员');
  }

  return ctx;
}

/**
 * Require authentication AND one of the specified roles.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if role not in allowed list.
 */
export async function requireRole(roles: InternalRole[]): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (!roles.includes(ctx.profile.role)) {
    throw new ForbiddenError('NO_PERMISSION', '没有执行此操作的权限');
  }

  return ctx;
}

/**
 * Require authentication AND canManageJob for a specific job.
 * super_admin bypasses the resource check.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if cannot manage the job.
 */
export async function requireCanManageJob(jobId: string): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    const { canManageJob } = await import('@/server/services/job-access');
    const canManage = await canManageJob(ctx.profile.id, jobId);
    if (!canManage) {
      throw new ForbiddenError('NO_PERMISSION', '没有操作该岗位的权限');
    }
  }

  return ctx;
}

/**
 * Require authentication AND canManageApplication for a specific application.
 * super_admin bypasses the resource check.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if cannot manage the application.
 */
export async function requireCanManageApplication(applicationId: string): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    const { canManageApplication } = await import('@/server/services/application-access');
    const canManage = await canManageApplication(ctx.profile.id, applicationId);
    if (!canManage) {
      throw new ForbiddenError('NO_PERMISSION', '没有操作该申请的权限');
    }
  }

  return ctx;
}

/**
 * Require authentication AND canReadApplication for a specific application.
 * super_admin bypasses the resource check.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if cannot read the application.
 */
export async function requireCanReadApplication(applicationId: string): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    const { canReadApplication } = await import('@/server/services/application-access');
    const canRead = await canReadApplication(ctx.profile.id, applicationId);
    if (!canRead) {
      throw new ForbiddenError('NO_PERMISSION', '没有查看该申请的权限');
    }
  }

  return ctx;
}

/**
 * Require authentication AND canManageLead for a specific lead.
 * super_admin bypasses the resource check.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if cannot manage the lead.
 */
export async function requireCanManageLead(leadId: string): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    const { canManageLead } = await import('@/server/services/lead-access');
    const canManage = await canManageLead(ctx.profile.id, leadId);
    if (!canManage) {
      throw new ForbiddenError('NO_PERMISSION', '没有操作该线索的权限');
    }
  }

  return ctx;
}

/**
 * Require authentication AND canManageTalent for a specific talent.
 * super_admin bypasses the resource check.
 * THROWS AuthError(401) if not authenticated.
 * THROWS ForbiddenError(403) if cannot manage the talent.
 */
export async function requireCanManageTalent(talentId: string): Promise<ActorContext> {
  const ctx = await resolveActorContext();

  if (!ctx) {
    throw new AuthError('Authentication required', 401);
  }

  if (ctx.profile.role !== 'super_admin') {
    const { canManageTalent } = await import('@/server/services/talent-access');
    const canManage = await canManageTalent(ctx.profile.id, talentId);
    if (!canManage) {
      throw new ForbiddenError('NO_PERMISSION', '没有操作该候选人的权限');
    }
  }

  return ctx;
}
