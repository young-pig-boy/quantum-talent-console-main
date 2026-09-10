import { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';

/**
 * POST /api/team/offboard
 * Deactivate a profile and reassign its owned resources.
 * Requires super_admin role.
 *
 * Body: {
 *   profile_id: string,
 *   reassign_to_id: string,
 *   resource_types?: string[]  // ['jobs', 'leads', 'talents', 'applications']
 * }
 *
 * Uses RPC: deactivate_profile_and_reassign
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(['super_admin']);

    const body = await request.json();
    const { profile_id, reassign_to_id, resource_types } = body as {
      profile_id?: string;
      reassign_to_id?: string;
      resource_types?: string[];
    };

    if (!profile_id || !reassign_to_id) {
      return apiSuccess({
        error: 'VALIDATION_ERROR',
        message: 'profile_id and reassign_to_id are required',
      });
    }

    if (profile_id === reassign_to_id) {
      return apiSuccess({
        error: 'VALIDATION_ERROR',
        message: 'Cannot reassign to the same profile',
      });
    }

    const supabase = getSupabaseAdminUntyped();

    const rpcParams: Record<string, unknown> = {
      p_profile_id: profile_id,
      p_reassign_to_id: reassign_to_id,
    };
    if (resource_types && resource_types.length > 0) {
      rpcParams.p_resource_types = resource_types;
    }

    const { data, error } = await supabase.rpc('deactivate_profile_and_reassign', rpcParams);

    if (error) {
      // Fallback: manual deactivation if RPC doesn't exist
      if (error.message?.includes('Could not find the function')) {
        // Step 1: Deactivate the profile
        const { error: deactivateError } = await supabase
          .from('profiles')
          .update({ status: 'inactive' })
          .eq('id', profile_id);

        if (deactivateError) {
          return apiSuccess({ error: 'DATABASE_ERROR', message: deactivateError.message });
        }

        // Step 2: Reassign resources
        const types = resource_types ?? ['jobs', 'leads', 'talents', 'applications'];
        const reassignResults: Record<string, unknown> = {};

        for (const type of types) {
          const table = type === 'applications' ? 'applications' : type;
          const { count, error: reassignError } = await supabase
            .from(table)
            .update({ owner_id: reassign_to_id })
            .eq('owner_id', profile_id);

          reassignResults[type] = {
            reassigned: count ?? 0,
            error: reassignError?.message ?? null,
          };
        }

        return apiSuccess({
          success: true,
          profile_id,
          reassign_to_id,
          deactivated: true,
          reassignments: reassignResults,
          note: 'RPC not available, used fallback manual deactivation',
        });
      }
      return apiSuccess({ error: 'RPC_ERROR', message: error.message });
    }

    return apiSuccess(data ?? { success: true, profile_id, reassign_to_id });
  } catch (e) {
    return catchApiErrors(e);
  }
}
