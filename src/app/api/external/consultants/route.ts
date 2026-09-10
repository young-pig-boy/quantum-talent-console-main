import { requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/external/consultants
 * List all external consultants.
 * Requires super_admin or team_lead role.
 */
export async function GET() {
  try {
    await requireRole(['super_admin', 'team_lead']);

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('external_consultants')
      .select('id, full_name, organization, phone, email, status, invited_by, activated_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return apiSuccess([]);
    }

    return apiSuccess(data ?? []);
  } catch (e) {
    return catchApiErrors(e);
  }
}
