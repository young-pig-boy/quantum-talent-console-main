import { NextRequest } from 'next/server';
import { LeadService } from '@/server/services/lead.service';
import { requireAuth, requireCanManageLead } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    const lead = await LeadService.getLead(id);
    return apiSuccess(lead);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    await requireCanManageLead(id);
    const body = await request.json();
    const lead = await LeadService.updateLead(id, body);
    return apiSuccess(lead);
  } catch (e) {
    return catchApiErrors(e);
  }
}
