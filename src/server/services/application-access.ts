/**
 * Application access control service.
 * Determines whether an actor can manage/read a specific application based on:
 * - Direct ownership (actor = application.owner_id)
 * - Manager relationship (actor is manager of application.owner_id)
 * - Team membership (actor is in the same team as application.owner_id)
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';

function getClient() {
  if (!hasSupabaseConfig()) return null;
  return getSupabaseAdminUntyped();
}

/**
 * Check if actor shares a scope with the owner of a resource.
 * Returns true if:
 * - actor is the owner
 * - actor is the manager of the owner
 * - actor is in the same team as the owner
 */
async function isOwnerScope(actorId: string, ownerId: string | null): Promise<boolean> {
  if (!ownerId) return false;
  if (ownerId === actorId) return true;

  const client = getClient();
  if (!client) return false;

  // Manager relationship
  const { data: ownerProfile } = await client
    .from('profiles')
    .select('id, manager_id')
    .eq('id', ownerId)
    .single();

  if (ownerProfile?.manager_id === actorId) return true;

  // Team membership
  const { data: actorTeams } = await client
    .from('team_memberships')
    .select('team_id')
    .eq('profile_id', actorId);

  if (!actorTeams || actorTeams.length === 0) return false;

  const actorTeamIds = actorTeams.map((t: { team_id: string }) => t.team_id);

  const { data: ownerTeams } = await client
    .from('team_memberships')
    .select('team_id')
    .eq('profile_id', ownerId)
    .in('team_id', actorTeamIds);

  return (ownerTeams?.length ?? 0) > 0;
}

/**
 * Check if actor can manage (write) a specific application.
 */
export async function canManageApplication(actorId: string, applicationId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data: app, error } = await client
    .from('applications')
    .select('id, owner_id')
    .eq('id', applicationId)
    .single();

  if (error || !app) return false;

  return isOwnerScope(actorId, app.owner_id);
}

/**
 * Check if actor can read a specific application.
 * Same scope as manage for now (can be expanded later).
 */
export async function canReadApplication(actorId: string, applicationId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data: app, error } = await client
    .from('applications')
    .select('id, owner_id')
    .eq('id', applicationId)
    .single();

  if (error || !app) return false;

  return isOwnerScope(actorId, app.owner_id);
}
