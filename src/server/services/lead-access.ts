/**
 * Lead access control service.
 * Determines whether an actor can manage a specific lead based on:
 * - Direct ownership (actor = lead.owner_id)
 * - Manager relationship (actor is manager of lead.owner_id)
 * - Team membership (actor is in the same team as lead.owner_id)
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';

function getClient() {
  if (!hasSupabaseConfig()) return null;
  return getSupabaseAdminUntyped();
}

/**
 * Check if actor can manage a specific lead.
 */
export async function canManageLead(actorId: string, leadId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const { data: lead, error } = await client
    .from('leads')
    .select('id, owner_id')
    .eq('id', leadId)
    .single();

  if (error || !lead) return false;

  const ownerId = lead.owner_id;
  if (!ownerId) return false;
  if (ownerId === actorId) return true;

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
