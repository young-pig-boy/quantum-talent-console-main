/**
 * ApplicationRepository — data access for applications.
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { Application, ApplicationFilters, PaginatedResult, TransitionWithContextParams, CreateApplicationWithContextParams } from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) throw new ConfigError('Supabase not configured.');
  return getSupabaseAdminUntyped();
}

export const ApplicationRepository = {
  async findById(id: string): Promise<Application> {
    const client = getClient();
    const { data, error } = await client.from('applications').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundError('Application', id);
    return data as Application;
  },

  async list(filters: ApplicationFilters): Promise<PaginatedResult<Application>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 50, 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('applications').select('*', { count: 'exact' });
    if (filters.job_id) query = query.eq('job_id', filters.job_id);
    if (filters.talent_id) query = query.eq('talent_id', filters.talent_id);
    if (filters.stage) query = query.eq('stage', filters.stage);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.due_before) query = query.lte('next_action_at', filters.due_before);
    if (filters.due_after) query = query.gte('next_action_at', filters.due_after);
    if (filters.company_id) {
      // 通过 job 反查属于该公司（需要 join）
      const { data: jobIds } = await client.from('jobs').select('id').eq('company_id', filters.company_id);
      const ids = (jobIds ?? []).map((j: { id: string }) => j.id);
      if (ids.length > 0) query = query.in('job_id', ids);
      else query = query.eq('job_id', '00000000-0000-0000-0000-000000000000');
    }

    const orderColumn = filters.order_by ?? 'updated_at';
    const ascending = filters.order === 'asc';
    query = query.order(orderColumn, { ascending, nullsFirst: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data ?? []) as Application[], total: count ?? 0, page, pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async checkDuplicate(talentId: string, jobId: string): Promise<Application | null> {
    const client = getClient();
    const { data } = await client.from('applications').select('*')
      .eq('talent_id', talentId).eq('job_id', jobId).maybeSingle();
    return data as Application | null;
  },

  /**
   * update — restricted to non-stage metadata fields only.
   *
   * Application.stage MUST be modified exclusively through transitionWithContext().
   * This method only accepts next_action_at (the sole PATCH-able field).
   */
  async update(id: string, input: { next_action_at?: string | null }): Promise<Application> {
    const client = getClient();
    const { data, error } = await client.from('applications').update(input).eq('id', id).select().single();
    if (error || !data) throw new NotFoundError('Application', id);
    return data as Application;
  },

  async listByTalent(talentId: string): Promise<Application[]> {
    const client = getClient();
    const { data, error } = await client.from('applications').select('*')
      .eq('talent_id', talentId).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Application[];
  },

  async listByJob(jobId: string): Promise<Application[]> {
    const client = getClient();
    const { data, error } = await client.from('applications').select('*')
      .eq('job_id', jobId).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Application[];
  },

  async countByStage(): Promise<Record<string, number>> {
    const client = getClient();
    const { data, error } = await client.from('applications').select('stage');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { stage: string }) => {
      counts[row.stage] = (counts[row.stage] ?? 0) + 1;
    });
    return counts;
  },

  async countByJobStage(jobId: string): Promise<Record<string, number>> {
    const client = getClient();
    const { data, error } = await client.from('applications').select('stage').eq('job_id', jobId);
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { stage: string }) => {
      counts[row.stage] = (counts[row.stage] ?? 0) + 1;
    });
    return counts;
  },

  async countByNextAction(): Promise<{ overdue: number; upcoming: number }> {
    const client = getClient();
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('applications')
      .select('next_action_at')
      .not('next_action_at', 'is', null)
      .not('stage', 'in', '(hired,rejected,withdrawn)');
    if (error) throw error;
    let overdue = 0;
    let upcoming = 0;
    (data ?? []).forEach((row: { next_action_at: string }) => {
      const t = row.next_action_at;
      if (t < now) overdue += 1;
      else if (t <= tomorrow) upcoming += 1;
    });
    return { overdue, upcoming };
  },

  /**
   * transitionWithContext — single entry point for Application stage transitions.
   *
   * Delegates to the Supabase RPC 'transition_application_stage', which:
   *   1. Updates applications.stage and related timestamp columns
   *   2. Passes actor_id and note to the DB Trigger
   *   3. DB Trigger writes a single StageEvent with created_by = actor_id
   *
   * This ensures exactly one StageEvent per transition, with the correct
   * server-resolved actor (not spoofed by the client).
   */
  async transitionWithContext(params: TransitionWithContextParams): Promise<Application> {
    const client = getClient();
    const { applicationId, toStage, actorId, note } = params;

    const { data, error } = await client.rpc('transition_application_stage', {
      p_application_id: applicationId,
      p_to_stage: toStage,
      p_actor_id: actorId,
      p_note: note,
    });

    if (error) throw error;
    if (!data) throw new NotFoundError('Application', applicationId);

    // RPC returns the updated application row (or null)
    if (Array.isArray(data)) {
      return data[0] as Application;
    }
    return data as Application;
  },

  /**
   * createWithContext — single entry point for Application creation.
   *
   * Delegates to the Supabase RPC 'create_application_with_context', which:
   *   1. Inserts into applications
   *   2. Passes actor_id to the DB Trigger
   *   3. DB Trigger writes the initial StageEvent with created_by = actor_id
   *
   * No direct INSERT into applications. No manual StageEvent INSERT.
   */
  async createWithContext(params: CreateApplicationWithContextParams): Promise<Application> {
    const client = getClient();
    const { applicationData, actorId } = params;

    const payload = {
      p_talent_id: applicationData.talent_id,
      p_job_id: applicationData.job_id,
      p_owner_id: applicationData.owner_id ?? null,
      p_stage: applicationData.stage ?? 'matching',
      p_actor_id: actorId,
    };

    const { data, error } = await client.rpc('create_application_with_context', payload);

    if (error) throw error;
    if (!data) throw new Error('Application creation failed: no data returned');

    if (Array.isArray(data)) {
      return data[0] as Application;
    }
    return data as Application;
  },
};
