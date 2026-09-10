import { CompanyRepository } from '@/server/repositories/company.repository';
import type { Company, CompanyFilters, PaginatedResult, CreateCompanyInput, UpdateCompanyInput } from '@/lib/domain/types';
import { ValidationError, BusinessError } from '@/lib/domain/errors';
import { createCompanySchema, updateCompanySchema } from '@/server/validation/schemas';

export const CompanyService = {
  async getCompany(id: string): Promise<Company> {
    return CompanyRepository.findById(id);
  },

  async listCompanies(filters: CompanyFilters): Promise<PaginatedResult<Company>> {
    return CompanyRepository.list(filters);
  },

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const parsed = createCompanySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid company data', parsed.error.flatten());
    }
    return CompanyRepository.create({
      ...parsed.data,
      description: parsed.data.description ?? null,
    } as Omit<Company, 'id' | 'created_at' | 'updated_at'>);
  },

  async updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
    const parsed = updateCompanySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid company data', parsed.error.flatten());
    }
    return CompanyRepository.update(id, parsed.data);
  },

  async setCompanyStatus(id: string, status: 'active' | 'inactive'): Promise<Company> {
    return CompanyRepository.setStatus(id, status);
  },

  async deleteCompany(id: string): Promise<void> {
    // 先确认公司存在
    await CompanyRepository.findById(id);
    // 业务保护：存在关联岗位时禁止删除
    const jobCount = await CompanyRepository.countJobs(id);
    if (jobCount > 0) {
      throw new BusinessError(
        'COMPANY_HAS_JOBS',
        `该公司下存在 ${jobCount} 个岗位，无法删除。请先处理关联岗位。`
      );
    }
    await CompanyRepository.delete(id);
  },
};
