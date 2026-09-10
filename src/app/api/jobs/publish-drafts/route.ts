import { publishAllDraftJobs } from '@/server/services/publish-drafts.service';
import { requirePermission } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

/**
 * POST /api/jobs/publish-drafts
 *
 * One-click operation: turn EVERY draft job into "recruiting" and publish
 * its public listing(s) for operation.
 *
 * - draft job with publication(s) → startRecruiting + publish (delegates to batchPublish)
 * - draft job without publication  → startRecruiting only (reported as no_publication)
 *
 * Idempotent by design: re-running only affects jobs still in draft.
 */
export async function POST() {
  try {
    await requirePermission('publication_publish');
    if (!hasSupabaseConfig()) {
      return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    }

    const result = await publishAllDraftJobs();
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
