import { NextRequest } from 'next/server';
import { PublicationService } from '@/server/services/publication.service';
import { requirePermission } from '@/server/auth/guard';
import { canManageJob } from '@/server/auth/permissions';
import { ForbiddenError } from '@/lib/domain/errors';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission('publication_publish');
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;

    if (ctx.profile.role !== 'super_admin') {
      const pub = await PublicationService.getPublication(id);
      const canManage = await canManageJob(ctx.profile.id, pub.job_id);
      if (!canManage) {
        throw new ForbiddenError('NO_RESOURCE_PERMISSION', '没有下架该岗位的权限');
      }
    }

    const result = await PublicationService.offlinePublication(id);
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
