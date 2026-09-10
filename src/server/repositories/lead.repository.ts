/**
 * LeadRepository — data access layer for leads.
 */
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { Lead, Talent, LeadFilters, PaginatedResult } from '@/lib/domain/types';
import { ConfigError, NotFoundError } from '@/lib/domain/errors';

function getClient() {
  if (!hasSupabaseConfig()) {
    throw new ConfigError('Supabase not configured.');
  }
  return getSupabaseAdminUntyped();
}

/** Result of the convert_lead_to_talent RPC (single atomic transaction). */
export interface ConvertLeadToTalentResult {
  lead: Lead;
  talent: Talent;
  isDuplicate: boolean;
}

export const LeadRepository = {
  async findById(id: string): Promise<Lead> {
    const client = getClient();
    const { data, error } = await client
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundError('Lead', id);
    return data as Lead;
  },

  async list(filters: LeadFilters): Promise<PaginatedResult<Lead>> {
    const client = getClient();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client.from('leads').select('*', { count: 'exact' });
    if (filters.keyword) {
      query = query.or(`full_name.ilike.%${filters.keyword}%,phone.ilike.%${filters.keyword}%,email.ilike.%${filters.keyword}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source_channel) query = query.eq('source_channel', filters.source_channel);
    if (filters.publication_id) query = query.eq('publication_id', filters.publication_id);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data ?? []) as Lead[],
      total: count ?? 0, page, pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async create(input: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const client = getClient();
    const { data, error } = await client.from('leads').insert(input).select().single();
    if (error) throw error;
    return data as Lead;
  },

  async update(id: string, input: Partial<Lead>): Promise<Lead> {
    const client = getClient();
    const { data, error } = await client.from('leads').update(input).eq('id', id).select().single();
    if (error || !data) throw new NotFoundError('Lead', id);
    return data as Lead;
  },

  /**
   * convertToTalent — single entry point for Lead → Talent conversion.
   *
   * Delegates to the Supabase RPC 'convert_lead_to_talent', which in a single
   * atomic transaction:
   *   1. Finds an existing Talent by normalized phone/email
   *   2. Reuses it, or creates a new Talent
   *   3. Updates leads.status = 'converted' + converted_talent_id
   *   4. Commits atomically
   *
   * Talent dedup rules live ONLY in the database RPC. The Console must not
   * re-implement a second dedup path (no TalentRepository.findByPhoneOrEmail
   * + create + LeadRepository.update two-step write).
   *
   * RPC errors surface as PostgrestError with business message prefixes:
   *   LEAD_NOT_FOUND                      — lead does not exist
   *   LEAD_MUST_BE_QUALIFIED: current=X   — lead is not qualified
   */
  async convertToTalent(leadId: string): Promise<ConvertLeadToTalentResult> {
    const client = getClient();
    const { data, error } = await client.rpc('convert_lead_to_talent', {
      p_lead_id: leadId,
    });
    if (error) throw error;
    if (!data) throw new NotFoundError('Lead', leadId);
    return data as ConvertLeadToTalentResult;
  },

  async checkDuplicate(phone?: string | null, email?: string | null): Promise<Lead | null> {
    const client = getClient();
    if (phone) {
      const { data } = await client.from('leads').select('*').eq('phone', phone).maybeSingle();
      if (data) return data as Lead;
    }
    if (email) {
      const { data } = await client.from('leads').select('*').eq('email', email).maybeSingle();
      if (data) return data as Lead;
    }
    return null;
  },

  async countByStatus(): Promise<Record<string, number>> {
    const client = getClient();
    const { data, error } = await client.from('leads').select('status');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((row: { status: string }) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    });
    return counts;
  },
};
