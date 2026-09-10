import { NextRequest } from 'next/server';
import { PublicApiService } from '@/server/services/public-api.service';
import { apiSuccess, apiError, apiNotFound, apiConfigError } from '@/server/auth/api-helpers';
import { BusinessError, ConfigError, NotFoundError } from '@/lib/domain/errors';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    if (!hasSupabaseConfig()) return apiConfigError();
    const job = await PublicApiService.getPublicJobBySlug(slug);
    return apiSuccess(job);
  } catch (e) {
    if (e instanceof ConfigError) return apiConfigError();
    if (e instanceof NotFoundError) return apiNotFound('Job', slug);
    if (e instanceof BusinessError) return apiError(e.code, e.message, 400);
    return apiError('DATABASE_ERROR', (e as Error).message, 500);
  }
}
