import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * GET /api/team/permissions
 * List all permission grants.
 */
export async function GET() {
  try {
    await requireAuth();

    const supabase = getSupabaseAdminUntyped();
    const { data, error } = await supabase
      .from('permission_grants')
      .select('id, grantee_id, permission_key, resource_type, resource_id, granted_by, status, expires_at, revoked_at, created_at, updated_at')
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
 * POST /api/team/permissions
 * Grant a permission to a user.
 * Requires super_admin role.
 * Body: { grantee_id, permission_key, resource_type?, resource_id?, expires_at? }
 * Uses RPC: grant_permission_with_context
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole(['super_admin']);

    const body = await request.json();
    const { grantee_id, permission_key, resource_type, resource_id, expires_at } = body as {
      grantee_id?: string;
      permission_key?: string;
      resource_type?: string;
      resource_id?: string;
      expires_at?: string;
    };

    if (!grantee_id || !permission_key) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'grantee_id and permission_key are required' });
    }

    const supabase = getSupabaseAdminUntyped();

    // Try RPC first
    const rpcParams: Record<string, unknown> = {
      p_grantee_id: grantee_id,
      p_permission_key: permission_key,
      p_granted_by: actor.profile.id,
    };
    if (resource_type) rpcParams.p_resource_type = resource_type;
    if (resource_id) rpcParams.p_resource_id = resource_id;
    if (expires_at) rpcParams.p_expires_at = expires_at;

    const { data, error } = await supabase.rpc('grant_permission_with_context', rpcParams);

    if (error) {
      // Fallback: direct INSERT if RPC doesn't exist
      if (error.message?.includes('Could not find the function')) {
        const { data: directData, error: directError } = await supabase
          .from('permission_grants')
          .insert({
            grantee_id,
            permission_key,
            resource_type: resource_type || null,
            resource_id: resource_id || null,
            granted_by: actor.profile.id,
            status: 'active',
            expires_at: expires_at || null,
          })
          .select()
          .single();

        if (directError) {
          return apiSuccess({ error: 'DATABASE_ERROR', message: directError.message });
        }
        return apiSuccess(directData);
      }
      return apiSuccess({ error: 'RPC_ERROR', message: error.message });
    }

    return apiSuccess(data);
  } catch (e) {
    return catchApiErrors(e);
  }
}

/**
 * DELETE /api/team/permissions
 * Revoke a permission grant.
 * Requires super_admin role.
 * Body: { grant_id: string } or { grantee_id: string, permission_key: string }
 * Uses RPC: revoke_permission_with_context
 */
export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireRole(['super_admin']);

    const body = await request.json();
    const { grant_id, grantee_id, permission_key } = body as {
      grant_id?: string;
      grantee_id?: string;
      permission_key?: string;
    };

    if (!grant_id && !(grantee_id && permission_key)) {
      return apiSuccess({ error: 'VALIDATION_ERROR', message: 'grant_id or (grantee_id + permission_key) required' });
    }

    const supabase = getSupabaseAdminUntyped();

    // Try RPC first
    const rpcParams: Record<string, unknown> = {
      p_revoked_by: actor.profile.id,
    };
    if (grant_id) {
      rpcParams.p_grant_id = grant_id;
    } else {
      rpcParams.p_grantee_id = grantee_id;
      rpcParams.p_permission_key = permission_key;
    }

    const { data, error } = await supabase.rpc('revoke_permission_with_context', rpcParams);

    if (error) {
      // Fallback: direct UPDATE if RPC doesn't exist
      if (error.message?.includes('Could not find the function')) {
        const query = grant_id
          ? supabase.from('permission_grants').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', grant_id)
          : supabase.from('permission_grants').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('grantee_id', grantee_id!).eq('permission_key', permission_key!);

        const { error: directError } = await query;
        if (directError) {
          return apiSuccess({ error: 'DATABASE_ERROR', message: directError.message });
        }
        return apiSuccess({ success: true, revoked: true });
      }
      return apiSuccess({ error: 'RPC_ERROR', message: error.message });
    }

    return apiSuccess(data ?? { success: true, revoked: true });
  } catch (e) {
    return catchApiErrors(e);
  }
}
