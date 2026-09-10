import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/team/members
 * List all internal profiles (team members).
 */
export async function GET() {
  try {
    await requireAuth();

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, manager_id, created_at, updated_at')
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
 * POST /api/team/members
 * Create a new team member profile (without Supabase Auth user).
 * Requires super_admin or team_lead role.
 * Body: { full_name: string, role: string, manager_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(['super_admin', 'team_lead']);

    const body = await request.json();
    const { full_name, role, manager_id } = body as {
      full_name?: string;
      role?: string;
      manager_id?: string;
    };

    if (!full_name) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'full_name is required' });
    }
    if (!role || !['team_lead', 'internal_consultant'].includes(role)) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'role must be team_lead or internal_consultant' });
    }

    const supabase = getSupabaseAdminUntyped();

    // Generate a deterministic UUID based on full_name for idempotency
    // In production, this would use Supabase Auth createUser
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        full_name,
        role,
        status: 'active',
        manager_id: manager_id || null,
      })
      .select('id, full_name, role, status, manager_id, created_at')
      .single();

    if (error) {
      return apiSuccess({ error: 'DATABASE_ERROR', message: error.message });
    }

    return apiSuccess(data);
  } catch (e) {
    return catchApiErrors(e);
  }
}

/**
 * PATCH /api/team/members
 * Update a team member's role, manager, or status.
 * Requires super_admin or team_lead role.
 * Body: { id: string, role?: string, manager_id?: string, status?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(['super_admin', 'team_lead']);

    const body = await request.json();
    const { id, role, manager_id, status } = body as {
      id?: string;
      role?: string;
      manager_id?: string;
      status?: string;
    };

    if (!id) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'id is required' });
    }

    const updates: Record<string, unknown> = {};
    if (role && ['super_admin', 'team_lead', 'internal_consultant'].includes(role)) {
      updates.role = role;
    }
    if (manager_id !== undefined) {
      updates.manager_id = manager_id || null;
    }
    if (status && ['active', 'inactive'].includes(status)) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'No valid fields to update' });
    }

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, role, status, manager_id, updated_at')
      .single();

    if (error) {
      return apiSuccess({ error: 'DATABASE_ERROR', message: error.message });
    }

    return apiSuccess(data);
  } catch (e) {
    return catchApiErrors(e);
  }
}
