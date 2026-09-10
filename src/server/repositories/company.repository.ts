/**
 * CompanyRepository — data access layer for companies.
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { Company, CompanyFilters, PaginatedResult } from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) {
    throw new ConfigError('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return getSupabaseAdminUntyped();
}

export const CompanyRepository = {
  async findById(id: string): Promise<Company> {
    const client = getClient();
    const { data, error } = await client
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundError('Company', id);
    return data as Company;
  },

  async list(filters: CompanyFilters): Promise<PaginatedResult<Company>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('companies').select('*', { count: 'exact' });

    if (filters.keyword) {
      query = query.or(
        `name.ilike.%${filters.keyword}%,display_name.ilike.%${filters.keyword}%`
      );
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('updated_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data ?? []) as Company[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async create(input: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const client = getClient();
    const { data, error } = await client
      .from('companies')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as Company;
  },

  async update(id: string, input: Partial<Company>): Promise<Company> {
    const client = getClient();
    const { data, error } = await client
      .from('companies')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Company', id);
    return data as Company;
  },

  async setStatus(id: string, status: 'active' | 'inactive'): Promise<Company> {
    return this.update(id, { status } as Partial<Company>);
  },

  async countJobs(id: string): Promise<number> {
    const client = getClient();
    const { count, error } = await client
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', id);

    if (error) throw error;
    return count ?? 0;
  },

  async delete(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
