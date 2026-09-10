import { api, type PaginatedData } from './client';

import type {
  Talent,
  CreateTalentInput,
  UpdateTalentInput,
  Application,
} from '@/lib/domain/types';

export type { Talent, CreateTalentInput, UpdateTalentInput };

export type TalentFilters = {
  keyword?: string;
  current_company?: string;
  current_title?: string;
  city?: string;
  source_channel?: string;
  owner_id?: string;
  tags?: string;
  ids?: string;
  page?: number;
  pageSize?: number;
};

export const talentsApi = {
  list(filters?: TalentFilters): Promise<PaginatedData<Talent>> {
    return api.get<PaginatedData<Talent>>('/api/talents', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<Talent & { applications?: Application[] }> {
    return api.get<Talent & { applications?: Application[] }>(`/api/talents/${id}`);
  },

  create(input: CreateTalentInput): Promise<Talent> {
    return api.post<Talent>('/api/talents', input);
  },

  update(id: string, input: UpdateTalentInput): Promise<Talent> {
    return api.patch<Talent>(`/api/talents/${id}`, input);
  },
};
