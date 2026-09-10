import { NextRequest } from 'next/server';
import { JobService } from '@/server/services/job.service';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { searchParams } = new URL(request.url);

    // Support batch fetch by IDs (used by Pipeline, Talent Detail)
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) return apiSuccess({ data: [], total: 0, page: 1, pageSize: 0, totalPages: 0 });
      const client = getSupabaseAdminUntyped();
      const { data, error } = await client
        .from('jobs')
        .select('*')
        .in('id', ids)
        .order('updated_at', { ascending: false });
      if (error) return apiError('DATABASE_ERROR', error.message, 500);
      const items = data ?? [];
      return apiSuccess({ data: items, total: items.length, page: 1, pageSize: items.length, totalPages: 1 });
    }

    const result = await JobService.listJobs({
      keyword: searchParams.get('keyword') ?? undefined,
      company_id: searchParams.get('company_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      owner_id: searchParams.get('owner_id') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
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
    const job = await JobService.createJob(body);
    return apiSuccess(job, 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
