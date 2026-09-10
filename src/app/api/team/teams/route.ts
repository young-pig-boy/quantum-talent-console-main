import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/team/teams
 * List all teams.
 */
export async function GET() {
  try {
    await requireAuth();

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, lead_id, parent_team_id, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return apiSuccess([]);
    }

    return apiSuccess(data ?? []);
  } catch (e) {
    return catchApiErrors(e);
  }
}

/**
 * POST /api/team/teams
 * Create a new team.
 * Requires super_admin or team_lead role.
 * Body: { name: string, lead_id?: string, parent_team_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(['super_admin', 'team_lead']);

    const body = await request.json();
    const { name, lead_id, parent_team_id } = body as {
      name?: string;
      lead_id?: string;
      parent_team_id?: string;
    };

    if (!name) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'name is required' });
    }

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name,
        lead_id: lead_id || null,
        parent_team_id: parent_team_id || null,
        status: 'active',
      })
      .select('id, name, lead_id, parent_team_id, status, created_at')
      .single();

    if (error) {
      return apiSuccess({ error: 'DATABASE_ERROR', message: error.message });
    }

    return apiSuccess(data);
  } catch (e) {
    return catchApiErrors(e);
  }
}
