import { api, type PaginatedData } from './client';

import type {
  JobPublication,
  CreatePublicationInput,
  UpdatePublicationInput,
  BatchOperationResult,
} from '@/lib/domain/types';

export type { JobPublication, BatchOperationResult };

export type PublicationFilters = {
  keyword?: string;
  status?: string;
  track?: string;
  city?: string;
  job_id?: string;
  site_id?: string;
  featured?: string;
  page?: number;
  pageSize?: number;
};

export const publicationsApi = {
  list(filters?: PublicationFilters): Promise<PaginatedData<JobPublication>> {
    return api.get<PaginatedData<JobPublication>>('/api/publications', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<JobPublication> {
    return api.get<JobPublication>(`/api/publications/${id}`);
  },

  create(input: CreatePublicationInput): Promise<JobPublication> {
    return api.post<JobPublication>('/api/publications', input);
  },

  update(id: string, input: UpdatePublicationInput): Promise<JobPublication> {
    return api.patch<JobPublication>(`/api/publications/${id}`, input);
  },

  feature(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/feature`);
  },

  unfeature(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/unfeature`);
  },

  publish(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/publish`);
  },

  offline(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/offline`);
  },

  republish(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/republish`);
  },

  archive(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/publications/${id}/archive`);
  },

  batchPublish(ids: string[]): Promise<BatchOperationResult> {
    return api.post<BatchOperationResult>('/api/publications/batch/publish', { ids });
  },

  batchOffline(ids: string[]): Promise<BatchOperationResult> {
    return api.post<BatchOperationResult>('/api/publications/batch/offline', { ids });
  },

  batchFeature(ids: string[]): Promise<BatchOperationResult> {
    return api.post<BatchOperationResult>('/api/publications/batch/feature', { ids });
  },

  batchUnfeature(ids: string[]): Promise<BatchOperationResult> {
    return api.post<BatchOperationResult>('/api/publications/batch/unfeature', { ids });
  },
};
