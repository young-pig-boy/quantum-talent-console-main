import { requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/team/audit-logs
 * List audit logs (most recent first).
 * Requires super_admin or team_lead role.
 */
export async function GET() {
  try {
    await requireRole(['super_admin', 'team_lead']);

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_kind, actor_profile_id, actor_external_consultant_id, action, target_type, target_id, before_data, after_data, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return apiSuccess([]);
    }

    return apiSuccess(data ?? []);
  } catch (e) {
    return catchApiErrors(e);
  }
}
