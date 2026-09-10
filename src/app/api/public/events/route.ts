import { NextRequest } from 'next/server';
import { PublicApiService } from '@/server/services/public-api.service';
import { apiSuccess, apiError, apiConfigError, apiValidationError } from '@/server/auth/api-helpers';
import { BusinessError, ConfigError } from '@/lib/domain/errors';
import { hasSupabaseConfig } from '@/lib/supabase/config';

const VALID_EVENT_TYPES = [
  'job_impression',
  'job_view',
  'share',
  'contact_click',
  'apply_start',
] as const;

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) return apiConfigError();

    const body = await request.json().catch(() => null);
    if (!body) return apiValidationError('Request body is required');

    const { event_type, publication_id, lead_id, source_channel, session_id, referrer, metadata } = body;

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return apiValidationError(`event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
    }
    if (!publication_id) return apiValidationError('publication_id is required');

    await PublicApiService.recordEvent({
      event_type,
      publication_id,
      lead_id,
      source_channel,
      session_id,
      referrer,
      metadata,
    });

    return apiSuccess({ recorded: true }, 201);
  } catch (e) {
    if (e instanceof ConfigError) return apiConfigError();
    if (e instanceof BusinessError) return apiError(e.code, e.message, 400);
    return apiError('DATABASE_ERROR', (e as Error).message, 500);
  }
}
