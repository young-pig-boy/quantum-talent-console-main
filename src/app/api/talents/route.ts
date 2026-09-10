import { NextRequest } from 'next/server';
import { TalentService } from '@/server/services/talent.service';
import { requireAuth } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { stripTalentPII } from '@/lib/domain/types';
import type { Talent } from '@/lib/domain/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { searchParams } = new URL(request.url);

    // Support batch fetch by IDs (used by Pipeline)
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) return apiSuccess({ data: [], total: 0, page: 1, pageSize: 0, totalPages: 0 });
      const client = getSupabaseAdminUntyped();
      const { data, error } = await client
        .from('talents')
        .select('*')
        .in('id', ids)
        .order('updated_at', { ascending: false });
      if (error) return apiError('DATABASE_ERROR', error.message, 500);
      const items = (data ?? []).map((t: Talent) => stripTalentPII(t));
      return apiSuccess({ data: items, total: items.length, page: 1, pageSize: items.length, totalPages: 1 });
    }

    const result = await TalentService.listTalents({
      keyword: searchParams.get('keyword') ?? undefined,
      current_company: searchParams.get('current_company') ?? undefined,
      current_title: searchParams.get('current_title') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      source_channel: searchParams.get('source_channel') ?? undefined,
      owner_id: searchParams.get('owner_id') ?? undefined,
      tags: searchParams.get('tags') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
    // Strip PII from list results
    return apiSuccess({
      ...result,
      data: result.data.map(stripTalentPII),
    });
  } catch (e) {
    return catchApiErrors(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const body = await request.json();
    const talent = await TalentService.createTalent(body);
    return apiSuccess(stripTalentPII(talent), 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
