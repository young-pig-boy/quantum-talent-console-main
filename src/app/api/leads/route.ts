import { NextRequest } from 'next/server';
import { LeadService } from '@/server/services/lead.service';
import { requireAuth } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { searchParams } = new URL(request.url);
    const result = await LeadService.listLeads({
      keyword: searchParams.get('keyword') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      source_channel: searchParams.get('source_channel') ?? undefined,
      publication_id: searchParams.get('publication_id') ?? undefined,
      owner_id: searchParams.get('owner_id') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const body = await request.json();
    const lead = await LeadService.createLead(body);
    return apiSuccess(lead, 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
