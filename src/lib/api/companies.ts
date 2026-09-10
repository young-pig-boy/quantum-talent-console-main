import { api, type PaginatedData } from './client';

// Re-export common types from domain
import type {
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '@/lib/domain/types';

export type { Company, CreateCompanyInput, UpdateCompanyInput };

export type CompanyFilters = {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export const companiesApi = {
  list(filters?: CompanyFilters): Promise<PaginatedData<Company>> {
    return api.get<PaginatedData<Company>>('/api/companies', filters as Record<string, string | undefined>);
  },

  getById(id: string): Promise<Company> {
    return api.get<Company>(`/api/companies/${id}`);
  },

  create(input: CreateCompanyInput): Promise<Company> {
    return api.post<Company>('/api/companies', input);
  },

  update(id: string, input: UpdateCompanyInput): Promise<Company> {
    return api.patch<Company>(`/api/companies/${id}`, input);
  },

  delete(id: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/api/companies/${id}`);
  },
};
