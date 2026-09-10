import { NextRequest } from 'next/server';
import { CompanyService } from '@/server/services/company.service';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const company = await CompanyService.getCompany(id);
    return apiSuccess(company);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['super_admin', 'team_lead']);
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    const body = await request.json();
    const company = await CompanyService.updateCompany(id, body);
    return apiSuccess(company);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['super_admin', 'team_lead']);
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await CompanyService.deleteCompany(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return catchApiErrors(e);
  }
}
