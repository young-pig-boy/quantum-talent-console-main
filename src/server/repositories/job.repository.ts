/**
 * JobRepository — data access layer for internal jobs.
 *
 * Field mapping (Domain ↔ Live Supabase):
 *   Domain jd              → DB original_jd
 *   Domain salary_internal  → DB internal_salary
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { Job, JobFilters, PaginatedResult } from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) {
    throw new ConfigError('Supabase not configured.');
  }
  return getSupabaseAdminUntyped();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromJobDb(row: any): Job {
  return {
    id: row.id,
    job_code: row.job_code ?? null,
    company_id: row.company_id,
    owner_id: row.owner_id,
    title: row.title,
    city: row.city,
    salary_internal: row.internal_salary ?? null,
    jd: row.original_jd ?? null,
    hard_requirements: row.hard_requirements,
    exclusion_rules: row.exclusion_rules,
    internal_notes: row.internal_notes,
    intake_metadata: row.intake_metadata ?? null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toJobDbCreate(input: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'job_code'>): Record<string, unknown> {
  return {
    company_id: input.company_id,
    owner_id: input.owner_id || null,
    title: input.title,
    city: input.city,
    original_jd: input.jd ?? null,
    internal_salary: input.salary_internal ?? null,
    hard_requirements: input.hard_requirements ?? null,
    exclusion_rules: input.exclusion_rules ?? null,
    internal_notes: input.internal_notes ?? null,
    intake_metadata: input.intake_metadata ?? {},
    status: input.status ?? 'draft',
  };
}

function toJobDbUpdate(input: Partial<Job>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.title !== undefined) result.title = input.title;
  if (input.city !== undefined) result.city = input.city;
  if (input.jd !== undefined) result.original_jd = input.jd;
  if (input.salary_internal !== undefined) result.internal_salary = input.salary_internal;
  if (input.hard_requirements !== undefined) result.hard_requirements = input.hard_requirements;
  if (input.exclusion_rules !== undefined) result.exclusion_rules = input.exclusion_rules;
  if (input.internal_notes !== undefined) result.internal_notes = input.internal_notes;
  if (input.intake_metadata !== undefined) result.intake_metadata = input.intake_metadata;
  if (input.status !== undefined) result.status = input.status;
  return result;
}

export const JobRepository = {
  async findById(id: string): Promise<Job> {
    const client = getClient();
    const { data, error } = await client
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundError('Job', id);
    return fromJobDb(data);
  },

  async list(filters: JobFilters): Promise<PaginatedResult<Job>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('jobs').select('*', { count: 'exact' });

    if (filters.keyword) {
      const kw = filters.keyword;
      query = query.or(`title.ilike.%${kw}%,job_code.ilike.%${kw}%`);
    }
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    query = query.order('updated_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data ?? []).map(fromJobDb),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async create(input: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'job_code'>): Promise<Job> {
    const client = getClient();
    const { data, error } = await client
      .from('jobs')
      .insert(toJobDbCreate(input))
      .select()
      .single();

    if (error) throw error;
    return fromJobDb(data);
  },

  async update(id: string, input: Partial<Job>): Promise<Job> {
    const client = getClient();
    const dbInput = toJobDbUpdate(input);
    const { data, error } = await client
      .from('jobs')
      .update(dbInput)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Job', id);
    return fromJobDb(data);
  },

  async updateStatus(id: string, status: Job['status']): Promise<Job> {
    return this.update(id, { status } as Partial<Job>);
  },

  async listByCompany(companyId: string): Promise<Job[]> {
    const client = getClient();
    const { data, error } = await client
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(fromJobDb);
  },

  async countByStatus(): Promise<Record<string, number>> {
    const client = getClient();
    const { data, error } = await client
      .from('jobs')
      .select('status');

    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { status: string }) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    });
    return counts;
  },
};
