import { NextRequest } from 'next/server';
import { LeadService } from '@/server/services/lead.service';
import { requireCanManageLead } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageLead(id);
    const body = await request.json().catch(() => ({}));
    const result = await LeadService.markInvalid(id, body.reason ?? '');
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}
