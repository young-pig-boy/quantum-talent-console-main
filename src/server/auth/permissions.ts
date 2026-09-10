/**
 * Permission Engine — unified authorization layer.
 *
 * Can(actor, action, resource) =
 *   Role Default
 *   + Management Scope
 *   + Permission Grant
 *   + Resource Ownership
 *
 * All permission checks go through this module. No page/API should
 * do its own `if (role === xxx)` check.
 */

import type { InternalRole, PermissionKey } from '@/lib/domain/types';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

// ─── Role Defaults ──────────────────────────────────────────────────────────

/**
 * Default permissions granted to each role (without explicit grants).
 * super_admin gets everything; team_lead gets management-scope defaults;
 * internal_consultant gets minimal defaults.
 */
const ROLE_DEFAULTS: Record<InternalRole, PermissionKey[]> = {
  super_admin: [
    'team_data_read',
    'team_progress_manage',
    'publication_edit',
    'publication_publish',
    'publication_operate',
    'showcase_analytics',
    'talent_contact_read',
    'external_collaboration_manage',
  ],
  team_lead: [
    'team_data_read',
    'team_progress_manage',
    'publication_edit',
    'publication_publish',
    'publication_operate',
    'showcase_analytics',
    'talent_contact_read',
  ],
  internal_consultant: [
    'publication_edit',
  ],
};

/**
 * Check if a role has a permission by default.
 */
export function hasRoleDefault(role: InternalRole, permission: PermissionKey): boolean {
  return ROLE_DEFAULTS[role]?.includes(permission) ?? false;
}

/**
 * Get all default permissions for a role.
 */
export function getRoleDefaults(role: InternalRole): PermissionKey[] {
  return [...(ROLE_DEFAULTS[role] ?? [])];
}

// ─── Effective Permissions ──────────────────────────────────────────────────

/**
 * Resolve the effective permission list for a user.
 * Combines role defaults + explicit grants from permission_grants table.
 */
export async function resolveEffectivePermissions(
  profileId: string,
  role: InternalRole,
): Promise<PermissionKey[]> {
  const defaults = getRoleDefaults(role);

  // super_admin always has everything
  if (role === 'super_admin') return defaults;

  try {
    const supabase = getSupabaseAdminUntyped();
    const { data: grants } = await supabase
      .from('permission_grants')
      .select('permission_key')
      .eq('grantee_id', profileId)
      .eq('status', 'active');

    const grantedKeys = (grants ?? []).map(
      (g: { permission_key: string }) => g.permission_key as PermissionKey,
    );

    // Merge defaults + grants (deduplicate)
    const merged = new Set<PermissionKey>([...defaults, ...grantedKeys]);
    return Array.from(merged);
  } catch {
    // Fail closed — only defaults
    return defaults;
  }
}

/**
 * Check if a user has a specific permission.
 * Uses DB RPC has_active_permission for grant-based checks,
 * combined with role defaults.
 */
export async function checkPermission(
  profileId: string,
  role: InternalRole,
  permission: PermissionKey,
): Promise<boolean> {
  // Role default check
  if (hasRoleDefault(role, permission)) return true;

  // Check explicit grant via DB RPC
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('has_active_permission', {
      p_user_id: profileId,
      p_permission_key: permission,
    });
    return data === true;
  } catch {
    return false;
  }
}

// ─── Resource Authorization ─────────────────────────────────────────────────

/**
 * Check if actor can manage (edit) a specific job.
 * Uses DB RPC can_manage_job.
 */
export async function canManageJob(
  actorId: string,
  jobId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('can_manage_job', {
      p_job_id: jobId,
      p_actor_id: actorId,
    });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if actor can write (edit/publish/operate) a publication.
 * Uses DB RPC can_write_publication.
 */
export async function canWritePublication(
  actorId: string,
  jobId: string,
  status: string,
  urgent: boolean,
  featured: boolean,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('can_write_publication', {
      p_actor_id: actorId,
      p_job_id: jobId,
      p_status: status,
      p_urgent: urgent,
      p_featured: featured,
    });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if actor can view a talent's contact info.
 * Uses DB RPC can_view_talent_contact.
 */
export async function canViewTalentContact(
  actorId: string,
  talentId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('can_view_talent_contact', {
      p_talent_id: talentId,
      p_actor_id: actorId,
    });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if actor can manage a specific application.
 */
export async function canManageApplication(
  actorId: string,
  applicationId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('can_manage_application', {
      p_application_id: applicationId,
      p_actor_id: actorId,
    });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if actor can read a specific application.
 */
export async function canReadApplication(
  actorId: string,
  applicationId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('can_read_application', {
      p_application_id: applicationId,
      p_actor_id: actorId,
    });
    return data === true;
  } catch {
    return false;
  }
}

// ─── Management Scope ───────────────────────────────────────────────────────

/**
 * Check if actor is a team lead of the target user (direct or transitive).
 */
export async function isManagerOf(
  actorId: string,
  targetUserId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('is_managed_by', {
      p_user_id: targetUserId,
      p_manager_id: actorId,
    });
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if two users share an active team.
 */
export async function sharesActiveTeam(
  userA: string,
  userB: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { data } = await supabase.rpc('shares_active_team', {
      p_user_a: userA,
      p_user_b: userB,
    });
    return data === true;
  } catch {
    return false;
  }
}

// ─── Grant / Revoke ─────────────────────────────────────────────────────────

/**
 * Grant a permission to a user. Must call DB RPC.
 * Team Lead can only grant to their managed users.
 * Internal Consultant cannot grant (no delegation).
 */
export async function grantPermission(params: {
  actorId: string;
  granteeId: string;
  permissionKey: string;
  resourceType?: string;
  resourceId?: string;
  expiresAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { error } = await supabase.rpc('grant_permission_with_context', {
      p_actor_id: params.actorId,
      p_grantee_id: params.granteeId,
      p_permission_key: params.permissionKey,
      p_resource_type: params.resourceType ?? null,
      p_resource_id: params.resourceId ?? null,
      p_expires_at: params.expiresAt ?? null,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Revoke a permission grant. Must call DB RPC.
 */
export async function revokePermission(params: {
  actorId: string;
  grantId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdminUntyped();
    const { error } = await supabase.rpc('revoke_permission_with_context', {
      p_actor_id: params.actorId,
      p_grant_id: params.grantId,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── Delegation Guard ───────────────────────────────────────────────────────

/**
 * Check if the actor is allowed to grant/revoke permissions.
 * - super_admin: can grant to anyone
 * - team_lead: can grant to their managed internal_consultants
 * - internal_consultant: CANNOT grant at all
 */
export function canDelegate(role: InternalRole): boolean {
  return role === 'super_admin' || role === 'team_lead';
}

// ─── Permission Labels ──────────────────────────────────────────────────────

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  team_data_read: '团队数据查看',
  team_progress_manage: '团队推进管理',
  publication_edit: '公开岗位编辑',
  publication_publish: '公开岗位发布',
  publication_operate: 'Showcase 岗位运营',
  showcase_analytics: 'Showcase 数据查看',
  talent_contact_read: '人才联系方式查看',
  external_collaboration_manage: '外部顾问协作管理',
};
