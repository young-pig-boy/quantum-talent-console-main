import { TalentRepository } from '@/server/repositories/talent.repository';
import { ApplicationRepository } from '@/server/repositories/application.repository';
import type { Talent, TalentFilters, PaginatedResult, CreateTalentInput, UpdateTalentInput } from '@/lib/domain/types';
import { ValidationError } from '@/lib/domain/errors';
import { createTalentSchema, updateTalentSchema } from '@/server/validation/schemas';

export const TalentService = {
  async getTalent(id: string): Promise<Talent> {
    return TalentRepository.findById(id);
  },

  async listTalents(filters: TalentFilters): Promise<PaginatedResult<Talent>> {
    return TalentRepository.list(filters);
  },

  async createTalent(input: CreateTalentInput): Promise<Talent> {
    const parsed = createTalentSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid talent data', parsed.error.flatten());
    return TalentRepository.create({
      ...parsed.data,
      current_company: parsed.data.current_company ?? null,
      current_title: parsed.data.current_title ?? null,
      city: parsed.data.city ?? null,
      education_summary: parsed.data.education_summary ?? null,
      experience_years: parsed.data.experience_years ?? null,
      resume_url: parsed.data.resume_url ?? null,
      source_channel: parsed.data.source_channel ?? null,
      tags: parsed.data.tags ?? [],
      notes: parsed.data.notes ?? null,
      owner_id: parsed.data.owner_id ?? null,
    } as Parameters<typeof TalentRepository.create>[0]);
  },

  async updateTalent(id: string, input: UpdateTalentInput): Promise<Talent> {
    const parsed = updateTalentSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid talent data', parsed.error.flatten());
    return TalentRepository.update(id, parsed.data);
  },

  async getTalentApplications(talentId: string) {
    return ApplicationRepository.listByTalent(talentId);
  },
};
