import { NextRequest } from 'next/server';
import { PublicApiService } from '@/server/services/public-api.service';
import { apiSuccess, apiError, apiConfigError } from '@/server/auth/api-helpers';
import { BusinessError, ConfigError } from '@/lib/domain/errors';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) return apiConfigError();
    const { searchParams } = new URL(request.url);
    const result = await PublicApiService.listPublicJobs({
      track: searchParams.get('track') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      keyword: searchParams.get('keyword') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
    return apiSuccess(result);
  } catch (e) {
    if (e instanceof ConfigError) return apiConfigError();
    if (e instanceof BusinessError) return apiError(e.code, e.message, 400);
    return apiError('DATABASE_ERROR', (e as Error).message, 500);
  }
}
