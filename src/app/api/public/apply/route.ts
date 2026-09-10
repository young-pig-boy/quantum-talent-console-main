import { NextRequest } from 'next/server';
import { PublicApiService } from '@/server/services/public-api.service';
import { apiSuccess, apiError, apiConfigError, apiValidationError } from '@/server/auth/api-helpers';
import { BusinessError, ConfigError } from '@/lib/domain/errors';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) return apiConfigError();

    const body = await request.json().catch(() => null);
    if (!body) return apiValidationError('Request body is required');

    if (!body.full_name) return apiValidationError('full_name is required');
    if (!body.phone && !body.email) return apiValidationError('phone or email is required');
    if (!body.publication_id) return apiValidationError('publication_id is required');

    const lead = await PublicApiService.applyForJob(body);
    return apiSuccess(lead, 201);
  } catch (e) {
    if (e instanceof ConfigError) return apiConfigError();
    if (e instanceof BusinessError) return apiError(e.code, e.message, 400, e.details);
    return apiError('DATABASE_ERROR', (e as Error).message, 500);
  }
}
