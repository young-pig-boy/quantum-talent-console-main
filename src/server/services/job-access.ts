/**
 * Job access control service.
 * Determines whether an actor can manage a specific job based on:
 * - Direct ownership (actor = job.owner_id)
 * - Manager relationship (actor is manager of job.owner_id)
 * - Team membership (actor is in the same team as job.owner_id)
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';

function getClient() {
  if (!hasSupabaseConfig()) return null;
  return getSupabaseAdminUntyped();
}

/**
 * Check if actor can manage a specific job.
 * Returns true if:
 * - actor is the job owner
 * - actor is the manager of the job owner
 * - actor is in the same team as the job owner
 */
export async function canManageJob(actorId: string, jobId: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  // 1. Get the job
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, owner_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job) return false;

  // 2. Direct ownership
  if (job.owner_id === actorId) return true;

  // 3. No owner → only super_admin can manage (handled by caller)
  if (!job.owner_id) return false;

  // 4. Manager relationship: actor is the manager of the job owner
  const { data: ownerProfile } = await client
    .from('profiles')
    .select('id, manager_id')
    .eq('id', job.owner_id)
    .single();

  if (ownerProfile?.manager_id === actorId) return true;

  // 5. Team membership: actor and job owner are in the same team
  const { data: actorTeams } = await client
    .from('team_memberships')
    .select('team_id')
    .eq('profile_id', actorId);

  if (!actorTeams || actorTeams.length === 0) return false;

  const actorTeamIds = actorTeams.map((t: { team_id: string }) => t.team_id);

  const { data: ownerTeams } = await client
    .from('team_memberships')
    .select('team_id')
    .eq('profile_id', job.owner_id)
    .in('team_id', actorTeamIds);

  return (ownerTeams?.length ?? 0) > 0;
}
