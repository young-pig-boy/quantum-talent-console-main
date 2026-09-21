/**
 * PublicationRepository — data access layer for job_publications.
 *
 * Field mapping (Domain ↔ Live Supabase):
 *   Domain title                    → DB public_title
 *   Domain title_en                 → DB public_title_en
 *   Domain company_display_name     → DB public_company_name
 *   Domain education_requirement    → DB education
 *   Domain education_en             → DB education_en
 *   Domain experience_requirement   → DB experience
 *   Domain experience_en            → DB experience_en
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type {
  JobPublication,
  PublicationFilters,
  PaginatedResult,
} from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) {
    throw new ConfigError('Supabase not configured.');
  }
  return getSupabaseAdminUntyped();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromPublicationDb(row: any): JobPublication {
  return {
    id: row.id,
    public_job_code: row.public_job_code ?? null,
    job_id: row.job_id,
    site_id: row.site_id,
    title: row.public_title,
    title_en: row.public_title_en ?? null,
    company_display_name: row.public_company_name,
    city: row.city,
    salary_display: row.salary_display,
    salary_display_en: row.salary_display_en,
    summary: row.summary,
    summary_en: row.summary_en ?? null,
    responsibilities: row.responsibilities,
    responsibilities_en: row.responsibilities_en ?? null,
    requirements: row.requirements,
    requirements_en: row.requirements_en ?? null,
    education_requirement: row.education,
    education_en: row.education_en ?? null,
    experience_requirement: row.experience,
    experience_en: row.experience_en ?? null,
    track: row.track,
    direction: row.direction,
    direction_en: row.direction_en ?? null,
    seniority: row.seniority,
    seniority_en: row.seniority_en ?? null,
    tags: row.tags,
    tags_en: row.tags_en,
    urgent: row.urgent ?? false,
    urgent_started_at: row.urgent_started_at ?? null,
    urgent_expires_at: row.urgent_expires_at ?? null,
    featured: row.featured ?? false,
    slug: row.slug,
    status: row.status,
    published_at: row.published_at,
    offline_at: row.offline_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPublicationDbCreate(input: Omit<JobPublication, 'id' | 'created_at' | 'updated_at' | 'public_job_code'>): Record<string, unknown> {
  return {
    job_id: input.job_id,
    site_id: input.site_id,
    public_title: input.title,
    public_title_en: input.title_en ?? null,
    public_company_name: input.company_display_name,
    city: input.city,
    salary_display: input.salary_display ?? null,
    salary_display_en: input.salary_display_en ?? null,
    summary: input.summary ?? null,
    summary_en: input.summary_en ?? null,
    responsibilities: input.responsibilities ?? null,
    responsibilities_en: input.responsibilities_en ?? null,
    requirements: input.requirements ?? null,
    requirements_en: input.requirements_en ?? null,
    education: input.education_requirement ?? null,
    education_en: input.education_en ?? null,
    experience: input.experience_requirement ?? null,
    experience_en: input.experience_en ?? null,
    track: input.track ?? null,
    direction: input.direction ?? null,
    direction_en: input.direction_en ?? null,
    seniority: input.seniority ?? null,
    seniority_en: input.seniority_en ?? null,
    tags: input.tags ?? [],
    tags_en: input.tags_en ?? null,
    urgent: input.urgent ?? false,
    urgent_started_at: input.urgent_started_at ?? null,
    urgent_expires_at: input.urgent_expires_at ?? null,
    featured: input.featured ?? false,
    slug: input.slug,
    status: input.status ?? 'draft',
    published_at: input.published_at ?? null,
    offline_at: input.offline_at ?? null,
  };
}

function toPublicationDbUpdate(input: Partial<JobPublication>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.title !== undefined) result.public_title = input.title;
  if (input.title_en !== undefined) result.public_title_en = input.title_en;
  if (input.company_display_name !== undefined) result.public_company_name = input.company_display_name;
  if (input.city !== undefined) result.city = input.city;
  if (input.salary_display !== undefined) result.salary_display = input.salary_display;
  if (input.salary_display_en !== undefined) result.salary_display_en = input.salary_display_en;
  if (input.summary !== undefined) result.summary = input.summary;
  if (input.summary_en !== undefined) result.summary_en = input.summary_en;
  if (input.responsibilities !== undefined) result.responsibilities = input.responsibilities;
  if (input.responsibilities_en !== undefined) result.responsibilities_en = input.responsibilities_en;
  if (input.requirements !== undefined) result.requirements = input.requirements;
  if (input.requirements_en !== undefined) result.requirements_en = input.requirements_en;
  if (input.requirements !== undefined) result.requirements = input.requirements;
  if (input.education_requirement !== undefined) result.education = input.education_requirement;
  if (input.education_en !== undefined) result.education_en = input.education_en;
  if (input.experience_requirement !== undefined) result.experience = input.experience_requirement;
  if (input.experience_en !== undefined) result.experience_en = input.experience_en;
  if (input.track !== undefined) result.track = input.track;
  if (input.direction !== undefined) result.direction = input.direction;
  if (input.direction_en !== undefined) result.direction_en = input.direction_en;
  if (input.seniority !== undefined) result.seniority = input.seniority;
  if (input.seniority_en !== undefined) result.seniority_en = input.seniority_en;
  if (input.tags !== undefined) result.tags = input.tags;
  if (input.tags_en !== undefined) result.tags_en = input.tags_en;
  if (input.urgent !== undefined) result.urgent = input.urgent;
  if (input.urgent_started_at !== undefined) result.urgent_started_at = input.urgent_started_at;
  if (input.urgent_expires_at !== undefined) result.urgent_expires_at = input.urgent_expires_at;
  if (input.featured !== undefined) result.featured = input.featured;
  if (input.slug !== undefined) result.slug = input.slug;
  if (input.status !== undefined) result.status = input.status;
  if (input.published_at !== undefined) result.published_at = input.published_at;
  if (input.offline_at !== undefined) result.offline_at = input.offline_at;
  return result;
}

export const PublicationRepository = {
  async findById(id: string): Promise<JobPublication> {
    const client = getClient();
    const { data, error } = await client
      .from('job_publications')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundError('JobPublication', id);
    return fromPublicationDb(data);
  },

  async findBySlug(slug: string): Promise<JobPublication | null> {
    const client = getClient();
    const { data, error } = await client
      .from('job_publications')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data ? fromPublicationDb(data) : null;
  },

  async list(filters: PublicationFilters): Promise<PaginatedResult<JobPublication>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('job_publications').select('*', { count: 'exact' });

    if (filters.keyword) {
      query = query.or(
        `public_title.ilike.%${filters.keyword}%,public_company_name.ilike.%${filters.keyword}%,public_job_code.ilike.%${filters.keyword}%`
      );
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.track) {
      if (filters.track === '__uncategorized') {
        query = query.or('track.is.null');
      } else {
        query = query.eq('track', filters.track);
      }
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id);
    }
    if (filters.job_id) {
      query = query.eq('job_id', filters.job_id);
    }
    if (filters.featured !== undefined) {
      query = query.eq('featured', filters.featured === 'true');
    }

    query = query.order('updated_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data ?? []).map(fromPublicationDb),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async listPublished(filters: PublicationFilters): Promise<PaginatedResult<JobPublication>> {
    return this.list({ ...filters, status: 'published' });
  },

  async countByStatus(status: string): Promise<number> {
    const client = getClient();
    const { count, error } = await client
      .from('job_publications')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (error) throw error;
    return count ?? 0;
  },

  async create(
    input: Omit<JobPublication, 'id' | 'created_at' | 'updated_at' | 'public_job_code'>
  ): Promise<JobPublication> {
    const client = getClient();
    const { data, error } = await client
      .from('job_publications')
      .insert(toPublicationDbCreate(input))
      .select()
      .single();

    if (error) throw error;
    return fromPublicationDb(data);
  },

  async update(id: string, input: Partial<JobPublication>): Promise<JobPublication> {
    const client = getClient();
    const dbInput = toPublicationDbUpdate(input);
    const { data, error } = await client
      .from('job_publications')
      .update(dbInput)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('JobPublication', id);
    return fromPublicationDb(data);
  },

  async updateStatus(
    id: string,
    status: JobPublication['status'],
    extra: { published_at?: string; offline_at?: string } = {}
  ): Promise<JobPublication> {
    const updateData: Record<string, unknown> = { status };
    if (extra.published_at) updateData.published_at = extra.published_at;
    if (extra.offline_at) updateData.offline_at = extra.offline_at;
    return this.update(id, updateData as Partial<JobPublication>);
  },

  async listByJob(jobId: string): Promise<JobPublication[]> {
    const client = getClient();
    const { data, error } = await client
      .from('job_publications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(fromPublicationDb);
  },

  async forceOfflineByJob(jobId: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('job_publications')
      .update({ status: 'offline', offline_at: new Date().toISOString(), urgent: false })
      .eq('job_id', jobId)
      .eq('status', 'published');

    if (error) throw error;
  },

  async forceArchiveByJob(jobId: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('job_publications')
      .update({ status: 'archived', urgent: false })
      .eq('job_id', jobId);

    if (error) throw error;
  },
};
