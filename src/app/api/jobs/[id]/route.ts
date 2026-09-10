import { NextRequest } from 'next/server';
import { JobService } from '@/server/services/job.service';
import { requireAuth, requireCanManageJob } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    const job = await JobService.getJob(id);
    return apiSuccess(job);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageJob(id);
    const body = await request.json();
    const job = await JobService.updateJob(id, body);
    return apiSuccess(job);
  } catch (e) {
    return catchApiErrors(e);
  }
}
