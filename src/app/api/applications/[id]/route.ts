import { NextRequest } from 'next/server';
import { ApplicationService } from '@/server/services/application.service';
import { requireAuth, requireCanReadApplication, requireCanManageApplication } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanReadApplication(id);
    const app = await ApplicationService.getApplication(id);
    return apiSuccess(app);
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
    await requireCanManageApplication(id);
    const body = await request.json();
    const app = await ApplicationService.updateApplication(id, body);
    return apiSuccess(app);
  } catch (e) {
    return catchApiErrors(e);
  }
}
