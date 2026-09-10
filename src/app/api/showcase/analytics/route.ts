import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/showcase/analytics
 * Get showcase analytics summary.
 */
export async function GET() {
  try {
    await requireAuth();

    const supabase = getSupabaseAdminUntyped();

    // Get page views count
    const { count: viewsCount } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true });

    // Get click events count
    const { count: clicksCount } = await supabase
      .from('click_events')
      .select('*', { count: 'exact', head: true });

    // Get applications count
    const { count: applicationsCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true });

    const totalViews = viewsCount ?? 0;
    const totalClicks = clicksCount ?? 0;
    const totalApplications = applicationsCount ?? 0;
    const conversionRate = totalViews > 0 ? totalApplications / totalViews : 0;

    return apiSuccess({
      total_views: totalViews,
      total_clicks: totalClicks,
      total_applications: totalApplications,
      conversion_rate: conversionRate,
    });
  } catch (e) {
    return catchApiErrors(e);
  }
}
