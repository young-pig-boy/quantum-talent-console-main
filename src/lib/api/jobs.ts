import { api, type PaginatedData } from './client';

import type {
  Job,
  CreateJobInput,
  UpdateJobInput,
  JobPublication,
  IntakeMetadata,
} from '@/lib/domain/types';

export type { Job, CreateJobInput, UpdateJobInput, IntakeMetadata };

export type JobFilters = {
  keyword?: string;
  company_id?: string;
  status?: string;
  city?: string;
  owner_id?: string;
  ids?: string;
  page?: number;
  pageSize?: number;
  order_by?: string;
  order?: string;
};

export const jobsApi = {
  list(filters?: JobFilters): Promise<PaginatedData<Job>> {
    return api.get<PaginatedData<Job>>('/api/jobs', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<Job> {
    return api.get<Job>(`/api/jobs/${id}`);
  },

  create(input: CreateJobInput): Promise<Job> {
    return api.post<Job>('/api/jobs', input);
  },

  update(id: string, input: UpdateJobInput): Promise<Job> {
    return api.patch<Job>(`/api/jobs/${id}`, input);
  },

  start(id: string): Promise<Job> {
    return api.post<Job>(`/api/jobs/${id}/start`);
  },

  pause(id: string): Promise<Job> {
    return api.post<Job>(`/api/jobs/${id}/pause`);
  },

  resume(id: string): Promise<Job> {
    return api.post<Job>(`/api/jobs/${id}/resume`);
  },

  close(id: string): Promise<Job> {
    return api.post<Job>(`/api/jobs/${id}/close`);
  },

  archive(id: string): Promise<Job> {
    return api.post<Job>(`/api/jobs/${id}/archive`);
  },

  generatePublication(id: string): Promise<JobPublication> {
    return api.post<JobPublication>(`/api/jobs/${id}/publication`);
  },
};
