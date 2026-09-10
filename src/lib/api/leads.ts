import { api, type PaginatedData } from './client';

import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  Talent,
} from '@/lib/domain/types';

export type { Lead, CreateLeadInput, UpdateLeadInput };

export type LeadFilters = {
  keyword?: string;
  status?: string;
  source_channel?: string;
  publication_id?: string;
  owner_id?: string;
  page?: number;
  pageSize?: number;
};

export const leadsApi = {
  list(filters?: LeadFilters): Promise<PaginatedData<Lead>> {
    return api.get<PaginatedData<Lead>>('/api/leads', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<Lead> {
    return api.get<Lead>(`/api/leads/${id}`);
  },

  create(input: CreateLeadInput): Promise<Lead> {
    return api.post<Lead>('/api/leads', input);
  },

  update(id: string, input: UpdateLeadInput): Promise<Lead> {
    return api.patch<Lead>(`/api/leads/${id}`, input);
  },

  review(id: string): Promise<Lead> {
    return api.post<Lead>(`/api/leads/${id}/review`);
  },

  contact(id: string): Promise<Lead> {
    return api.post<Lead>(`/api/leads/${id}/contact`);
  },

  qualify(id: string): Promise<Lead> {
    return api.post<Lead>(`/api/leads/${id}/qualify`);
  },

  invalidate(id: string, reason?: string): Promise<Lead> {
    return api.post<Lead>(`/api/leads/${id}/invalidate`, { reason });
  },

  convert(id: string): Promise<{ lead: Lead; talent: Talent; isDuplicate: boolean }> {
    return api.post<{ lead: Lead; talent: Talent; isDuplicate: boolean }>(`/api/leads/${id}/convert`);
  },
};
