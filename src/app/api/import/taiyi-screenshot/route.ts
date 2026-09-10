import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/auth/guard';
import { catchApiErrors } from '@/server/auth/api-helpers';
import { runTaiyiScreenshotImport } from '@/server/services/taiyi-screenshot-import.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/import/taiyi-screenshot
 * 太一量生（截图核验版）岗位导入：按 slug 幂等去重，Job + Publication 统一 draft（不发布）。
 * list_only（JD 不完整）岗位跳过公开创建。可重复运行（幂等）。
 */
export async function POST() {
  try {
    await requirePermission('publication_publish');
  } catch (e) {
    return catchApiErrors(e);
  }

  try {
    const summary = await runTaiyiScreenshotImport();
    return NextResponse.json({
      success: true,
      data: {
        total: summary.total,
        created: summary.created.length,
        matched: summary.matched.length,
        skipped_list_only: summary.skippedListOnly.length,
        failed: summary.failed.length,
        company_id: summary.companyId,
        site_id: summary.siteId,
        created_items: summary.created,
        matched_items: summary.matched,
        skipped_items: summary.skippedListOnly,
        failed_items: summary.failed,
        pending_confirm: summary.pendingConfirm,
        unmapped_fields: summary.unmappedFields,
      },
    });
  } catch (e) {
    return catchApiErrors(e);
  }
}
