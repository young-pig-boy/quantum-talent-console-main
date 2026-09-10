import { NextRequest } from 'next/server';
import { CompanyService } from '@/server/services/company.service';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);

    const { searchParams } = new URL(request.url);
    const filters = {
      keyword: searchParams.get('keyword') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    };

    const result = await CompanyService.listCompanies(filters);
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['super_admin', 'team_lead']);
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);

    const body = await request.json();
    const company = await CompanyService.createCompany(body);
    return apiSuccess(company, 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
