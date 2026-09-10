import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { AnalyticsEvent, AnalyticsEventType } from '@/lib/domain/types';
import { ConfigError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) throw new ConfigError('Supabase not configured.');
  return getSupabaseAdminUntyped();
}

export const AnalyticsRepository = {
  async create(input: Omit<AnalyticsEvent, 'id' | 'occurred_at'> & { occurred_at?: string }): Promise<AnalyticsEvent> {
    const client = getClient();
    const { data, error } = await client.from('analytics_events').insert({
      ...input,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data as AnalyticsEvent;
  },

  async countByType(publicationId: string): Promise<Record<string, number>> {
    const client = getClient();
    const { data, error } = await client.from('analytics_events')
      .select('event_type').eq('publication_id', publicationId);
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { event_type: string }) => {
      counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    });
    return counts;
  },

  async countByTypeMultiple(publicationIds: string[]): Promise<Record<string, Record<string, number>>> {
    const client = getClient();
    const { data, error } = await client.from('analytics_events')
      .select('publication_id,event_type').in('publication_id', publicationIds);
    if (error) throw error;
    const result: Record<string, Record<string, number>> = {};
    (data ?? []).forEach((row: { publication_id: string; event_type: string }) => {
      if (!result[row.publication_id]) result[row.publication_id] = {};
      result[row.publication_id][row.event_type] = (result[row.publication_id][row.event_type] ?? 0) + 1;
    });
    return result;
  },

  async getSourceDistribution(siteId?: string): Promise<Record<string, number>> {
    const client = getClient();
    let query = client.from('analytics_events').select('source_channel');
    if (siteId) query = query.eq('site_id', siteId);
    const { data, error } = await query;
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { source_channel: string | null }) => {
      const ch = row.source_channel ?? 'unknown';
      counts[ch] = (counts[ch] ?? 0) + 1;
    });
    return counts;
  },

  async getRecentEvents(limit = 20): Promise<AnalyticsEvent[]> {
    const client = getClient();
    const { data, error } = await client.from('analytics_events')
      .select('*').order('occurred_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as AnalyticsEvent[];
  },
};
