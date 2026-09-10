import { NextRequest } from 'next/server';
import { JobService } from '@/server/services/job.service';
import { requireCanManageJob } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageJob(id);
    const result = await JobService.archiveJob(id);
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
