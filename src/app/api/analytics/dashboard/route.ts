import { NextRequest } from 'next/server';
import { AnalyticsService } from '@/server/services/analytics.service';
import { requireAuth } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const dashboard = await AnalyticsService.getDashboardSummary();
    return apiSuccess(dashboard);
  } catch (e) {
    return catchApiErrors(e);
  }
}
