import { NextRequest } from 'next/server';
import { PublicationService } from '@/server/services/publication.service';
import { requireAuth } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { searchParams } = new URL(request.url);
    const result = await PublicationService.listPublications({
      keyword: searchParams.get('keyword') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      track: searchParams.get('track') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      job_id: searchParams.get('job_id') ?? undefined,
      site_id: searchParams.get('site_id') ?? undefined,
      featured: searchParams.get('featured') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
