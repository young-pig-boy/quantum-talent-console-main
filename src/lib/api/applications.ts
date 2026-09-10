import { api, type PaginatedData } from './client';

import type {
  Application,
  ApplicationFilters,
  CreateApplicationInput,
  TransitionApplicationInput,
  StageEvent,
} from '@/lib/domain/types';

export type { Application, ApplicationFilters, CreateApplicationInput, TransitionApplicationInput, StageEvent };

export type UpdateApplicationInput = Partial<Application> & {
  next_action_at?: string | null;
};

export const applicationsApi = {
  list(filters?: ApplicationFilters): Promise<PaginatedData<Application>> {
    return api.get<PaginatedData<Application>>('/api/applications', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<Application & { stageEvents?: StageEvent[] }> {
    return api.get<Application & { stageEvents?: StageEvent[] }>(`/api/applications/${id}`);
  },

  create(input: CreateApplicationInput): Promise<Application> {
    return api.post<Application>('/api/applications', input);
  },

  update(id: string, input: UpdateApplicationInput): Promise<Application> {
    return api.patch<Application>(`/api/applications/${id}`, input);
  },

  transition(id: string, input: TransitionApplicationInput): Promise<Application> {
    return api.post<Application>(`/api/applications/${id}/transition`, input);
  },
};
