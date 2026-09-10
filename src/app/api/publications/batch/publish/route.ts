import { NextRequest } from 'next/server';
import { PublicationService } from '@/server/services/publication.service';
import { requirePermission } from '@/server/auth/guard';
import { canManageJob } from '@/server/auth/permissions';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { BatchOperationResult, BatchOperationItemResult } from '@/lib/domain/types';
import { z } from 'zod';

const batchPublishSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(25),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePermission('publication_publish');
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const body = await request.json();
    const parsed = batchPublishSchema.parse(body);

    // Resource-level check: filter to only jobs the actor can manage.
    // FAIL-CLOSED: any error during authorization = deny that item.
    const allowedIds: string[] = [];
    const deniedItems: BatchOperationItemResult[] = [];

    if (ctx.profile.role === 'super_admin') {
      allowedIds.push(...parsed.ids);
    } else {
      for (const id of parsed.ids) {
        try {
          const pub = await PublicationService.getPublication(id);
          const canManage = await canManageJob(ctx.profile.id, pub.job_id);
          if (canManage) {
            allowedIds.push(id);
          } else {
            deniedItems.push({ id, status: 'failed', message: '没有操作该岗位的权限' });
          }
        } catch {
          // Publication not found, RPC error, or any other failure → DENY
          deniedItems.push({ id, status: 'failed', message: '权限校验失败，已拒绝操作' });
        }
      }
    }

    let result: BatchOperationResult;
    if (allowedIds.length > 0) {
      result = await PublicationService.batchPublish(allowedIds);
    } else {
      result = { total: parsed.ids.length, success: 0, skipped: 0, failed: deniedItems.length, results: [] };
    }

    // Merge denied items into results
    result.results = [...result.results, ...deniedItems];
    result.failed += deniedItems.length;
    result.total = parsed.ids.length;

    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
