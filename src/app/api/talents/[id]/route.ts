import { NextRequest } from 'next/server';
import { TalentService } from '@/server/services/talent.service';
import { requireAuth, requireCanManageTalent } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { stripTalentPII } from '@/lib/domain/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { id } = await params;
    const talent = await TalentService.getTalent(id);
    return apiSuccess(stripTalentPII(talent));
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
    await requireCanManageTalent(id);
    const body = await request.json();
    const talent = await TalentService.updateTalent(id, body);
    return apiSuccess(stripTalentPII(talent));
  } catch (e) {
    return catchApiErrors(e);
  }
}
