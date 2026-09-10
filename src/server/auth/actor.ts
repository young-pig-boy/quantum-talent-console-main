/**
 * Actor Context — resolves the full identity, teams, and permissions
 * for the current request. This is the single source of truth for
 * "who is making this request and what can they do".
 */

import type { ActorContext, InternalRole, Profile, Team } from '@/lib/domain/types';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { LOCAL_SUPER_ADMIN_PROFILE } from '../local-access/config';
import { getRoleDefaults, resolveEffectivePermissions } from './permissions';

/**
 * Build a break-glass ActorContext for the Super Admin.
 * This is completely independent of Supabase — uses the synthetic
 * LOCAL_SUPER_ADMIN_PROFILE and full super_admin permissions.
 */
export function buildBreakGlassActorContext(): ActorContext {
  return {
    profile: LOCAL_SUPER_ADMIN_PROFILE,
    teams: [],
    permissions: getRoleDefaults('super_admin'),
    is_break_glass: true,
  };
}

/**
 * Build a full ActorContext from a profile ID.
 * When isBreakGlass is true, returns the synthetic break-glass identity
 * without querying Supabase.
 */
export async function buildActorContext(
  profileId: string,
  isBreakGlass: boolean = false,
): Promise<ActorContext | null> {
  // Break-glass short-circuit: no Supabase dependency
  if (isBreakGlass) {
    return buildBreakGlassActorContext();
  }

  try {
    const supabase = getSupabaseAdminUntyped();

    // 1. Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, manager_id, created_at, updated_at')
      .eq('id', profileId)
      .single();

    if (!profileData) return null;

    const profile: Profile = {
      id: profileData.id,
      full_name: profileData.full_name,
      role: profileData.role as InternalRole,
      status: profileData.status,
      manager_id: profileData.manager_id ?? null,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
    };

    if (profile.status !== 'active') return null;

    // 2. Fetch teams (via team_memberships)
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id, teams(id, name, lead_id, parent_team_id, status, created_at, updated_at)')
      .eq('profile_id', profileId)
      .eq('status', 'active');

    const teams: Team[] = (memberships ?? [])
      .map((m: { teams: Team | null }) => m.teams)
      .filter((t: Team | null): t is Team => t !== null && t.status === 'active');

    // 3. Resolve effective permissions
    const permissions = await resolveEffectivePermissions(profileId, profile.role);

    return {
      profile,
      teams,
      permissions,
      is_break_glass: isBreakGlass,
    };
  } catch {
    return null;
  }
}

/**
 * Check if the actor context has a specific permission.
 */
export function actorHasPermission(
  ctx: ActorContext,
  permission: string,
): boolean {
  return ctx.permissions.includes(permission);
}

/**
 * Check if the actor is a super admin.
 */
export function actorIsSuperAdmin(ctx: ActorContext): boolean {
  return ctx.profile.role === 'super_admin';
}

/**
 * Check if the actor is a team lead.
 */
export function actorIsTeamLead(ctx: ActorContext): boolean {
  return ctx.profile.role === 'team_lead';
}

/**
 * Check if the actor can delegate permissions (grant/revoke).
 */
export function actorCanDelegate(ctx: ActorContext): boolean {
  return ctx.profile.role === 'super_admin' || ctx.profile.role === 'team_lead';
}
