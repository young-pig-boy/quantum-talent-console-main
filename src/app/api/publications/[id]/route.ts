import { NextRequest } from 'next/server';
import { PublicationService } from '@/server/services/publication.service';
import { requireAuth, requirePermission } from '@/server/auth/guard';
import { canManageJob } from '@/server/auth/permissions';
import { ForbiddenError } from '@/lib/domain/errors';
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
    const pub = await PublicationService.getPublication(id);
    return apiSuccess(pub);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission('publication_edit');
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;

    // Resource-level check: actor must be able to manage the underlying job
    if (ctx.profile.role !== 'super_admin') {
      const pub = await PublicationService.getPublication(id);
      const canManage = await canManageJob(ctx.profile.id, pub.job_id);
      if (!canManage) {
        throw new ForbiddenError('NO_RESOURCE_PERMISSION', '没有编辑该岗位的权限');
      }
    }

    const body = await request.json();
    const pub = await PublicationService.updatePublication(id, body);
    return apiSuccess(pub);
  } catch (e) {
    return catchApiErrors(e);
  }
}
