import { NextRequest } from 'next/server';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { requirePermission } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { hasSupabaseConfig } from '@/lib/supabase/config';

/**
 * GET /api/team/contact-requests
 * List pending contact access requests (for Team Lead / Super Admin).
 */
export async function GET(_request: NextRequest) {
  try {
    await requirePermission('talent_contact_read');
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);

    const supabase = getSupabaseAdminUntyped();

    // Query contact_access_requests table for pending requests
    const { data, error } = await supabase
      .from('contact_access_requests')
      .select(`
        *,
        requester:profiles!contact_access_requests_requester_id_fkey(id, full_name, role),
        talent:talents!contact_access_requests_talent_id_fkey(id, full_name, current_company, current_title)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Table or RPC might not exist yet - return empty array gracefully
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return apiSuccess([]);
      }
      throw error;
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    return catchApiErrors(error);
  }
}
