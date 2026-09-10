import { NextRequest } from 'next/server';
import { PublicationService } from '@/server/services/publication.service';
import { requireAuth, requireCanManageJob } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';

import { hasSupabaseConfig } from '@/lib/supabase/config';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageJob(id);
    const body = await request.json().catch(() => ({}));
    let siteId = body.site_id;
    if (!siteId) {
      const client = getSupabaseAdminUntyped();
      const { data } = await client.from('sites').select('id').eq('status', 'active').limit(1).single();
      siteId = data?.id;
      if (!siteId) return apiError('VALIDATION_ERROR', 'No active site found. Please provide site_id.', 400);
    }
    const pub = await PublicationService.createPublicationFromJob(id, siteId);
    return apiSuccess(pub, 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
