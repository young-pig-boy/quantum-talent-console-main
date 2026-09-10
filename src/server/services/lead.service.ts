import { LeadRepository } from '@/server/repositories/lead.repository';
import { transitionLead } from '@/lib/domain/lead-state-machine';
import type { Lead, Talent, LeadFilters, PaginatedResult, CreateLeadInput, UpdateLeadInput } from '@/lib/domain/types';
import { ValidationError, NotFoundError } from '@/lib/domain/errors';
import { createLeadSchema, updateLeadSchema } from '@/server/validation/schemas';

export const LeadService = {
  async getLead(id: string): Promise<Lead> {
    return LeadRepository.findById(id);
  },

  async listLeads(filters: LeadFilters): Promise<PaginatedResult<Lead>> {
    return LeadRepository.list(filters);
  },

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid lead data', parsed.error.flatten());
    return LeadRepository.create({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      wechat: parsed.data.wechat ?? null,
      site_id: parsed.data.site_id,
      publication_id: parsed.data.publication_id,
      source_channel: parsed.data.source_channel ?? null,
      source_detail: parsed.data.source_detail ?? null,
      resume_url: parsed.data.resume_url ?? null,
      status: 'new',
      invalid_reason: null,
      notes: null,
      owner_id: null,
      converted_talent_id: null,
      reviewed_at: null,
      converted_at: null,
    });
  },

  async updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
    const parsed = updateLeadSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid lead data', parsed.error.flatten());
    return LeadRepository.update(id, parsed.data);
  },

  async markReviewed(id: string, ownerId?: string): Promise<Lead> {
    const lead = await LeadRepository.findById(id);
    transitionLead(lead.status, 'reviewed');
    return LeadRepository.update(id, {
      status: 'reviewed',
      owner_id: ownerId ?? lead.owner_id,
      reviewed_at: new Date().toISOString(),
    });
  },

  async startContacting(id: string): Promise<Lead> {
    const lead = await LeadRepository.findById(id);
    transitionLead(lead.status, 'contacting');
    return LeadRepository.update(id, { status: 'contacting' });
  },

  async markQualified(id: string, notes?: string): Promise<Lead> {
    const lead = await LeadRepository.findById(id);
    transitionLead(lead.status, 'qualified');
    return LeadRepository.update(id, { status: 'qualified', notes: notes ?? lead.notes });
  },

  async markInvalid(id: string, reason: string): Promise<Lead> {
    const lead = await LeadRepository.findById(id);
    transitionLead(lead.status, 'invalid');
    return LeadRepository.update(id, { status: 'invalid', invalid_reason: reason });
  },

  /**
   * convertLeadToTalent — Lead → Talent conversion.
   *
   * Business entry point only. The actual conversion (dedup lookup, Talent
   * reuse/create, leads.status = 'converted', converted_talent_id write) is
   * performed atomically by the Supabase RPC 'convert_lead_to_talent' —
   * the single transaction Source of Truth for this flow.
   *
   * The Console deliberately does NOT re-implement the dedup rules here
   * (no findByPhoneOrEmail + create + update two-step write) to avoid
   * diverging from the database rules.
   *
   * RPC result { lead, talent, isDuplicate } maps 1:1 to the API contract.
   */
  async convertLeadToTalent(leadId: string): Promise<{ lead: Lead; talent: Talent; isDuplicate: boolean }> {
    try {
      return await LeadRepository.convertToTalent(leadId);
    } catch (e) {
      throw mapConvertLeadToTalentError(e, leadId);
    }
  },
};

/**
 * Maps RPC errors to domain errors so the API keeps its previous semantics:
 *   LEAD_NOT_FOUND                    → 404 NOT_FOUND
 *   LEAD_MUST_BE_QUALIFIED: current=X → 400 VALIDATION_ERROR
 *   anything else                     → rethrown as-is (500 INTERNAL_ERROR)
 */
function mapConvertLeadToTalentError(e: unknown, leadId: string): unknown {
  const message = e instanceof Error ? e.message : '';
  if (message.startsWith('LEAD_NOT_FOUND')) {
    return new NotFoundError('Lead', leadId);
  }
  const match = message.match(/^LEAD_MUST_BE_QUALIFIED:\s*current=(\S+)/);
  if (match) {
    return new ValidationError(`Lead must be qualified before conversion. Current: ${match[1]}`);
  }
  return e;
}
