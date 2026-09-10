/**
 * TalentRepository — data access layer for talents.
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { Talent, TalentFilters, PaginatedResult } from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) throw new ConfigError('Supabase not configured.');
  return getSupabaseAdminUntyped();
}

export const TalentRepository = {
  async findById(id: string): Promise<Talent> {
    const client = getClient();
    const { data, error } = await client.from('talents').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundError('Talent', id);
    return data as Talent;
  },

  async list(filters: TalentFilters): Promise<PaginatedResult<Talent>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('talents').select('*', { count: 'exact' });
    if (filters.keyword) {
      query = query.or(`full_name.ilike.%${filters.keyword}%,current_company.ilike.%${filters.keyword}%,current_title.ilike.%${filters.keyword}%`);
    }
    if (filters.source_channel) query = query.eq('source_channel', filters.source_channel);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    query = query.order('updated_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data ?? []) as Talent[], total: count ?? 0, page, pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async create(input: Omit<Talent, 'id' | 'created_at' | 'updated_at'>): Promise<Talent> {
    const client = getClient();
    const { data, error } = await client.from('talents').insert(input).select().single();
    if (error) throw error;
    return data as Talent;
  },

  async update(id: string, input: Partial<Talent>): Promise<Talent> {
    const client = getClient();
    const { data, error } = await client.from('talents').update(input).eq('id', id).select().single();
    if (error || !data) throw new NotFoundError('Talent', id);
    return data as Talent;
  },
};
