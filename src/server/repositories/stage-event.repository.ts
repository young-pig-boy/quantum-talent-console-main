import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { StageEvent } from '@/lib/domain/types';
import { ConfigError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) throw new ConfigError('Supabase not configured.');
  return getSupabaseAdminUntyped();
}

/**
 * StageEventRepository — READ-ONLY data access for stage_events.
 *
 * Application lifecycle auto-events (application_created / stage_change)
 * are written exclusively by the database Trigger
 * `record_application_stage_event()`. This repository no longer exposes
 * any write capability to guarantee a single write source.
 *
 * If a future manual business event feature (consultant note/comment) is
 * introduced, it must be implemented as a dedicated, explicitly
 * MANUAL_BUSINESS_EVENT write path — separate from lifecycle auto-events.
 */
export const StageEventRepository = {
  async listByApplication(applicationId: string): Promise<StageEvent[]> {
    const client = getClient();
    const { data, error } = await client.from('stage_events')
      .select('*').eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as StageEvent[];
  },
};
