import { NextRequest } from 'next/server';
import { JobService } from '@/server/services/job.service';
import { requireCanManageJob } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

async function handleJobTransition(
  { params }: { params: Promise<{ id: string }> },
  action: (id: string) => Promise<unknown>
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageJob(id);
    const result = await action(id);
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export const POST = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) =>
  handleJobTransition(ctx, (id) => JobService.startRecruiting(id));
