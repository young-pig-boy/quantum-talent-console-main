import { NextRequest } from 'next/server';
import { apiSuccess, catchApiErrors } from '@/server/auth/api-helpers';
import { resolveCurrentActor, requirePermission } from '@/server/auth/guard';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';
import { maskTalentContact } from '@/lib/contact-mask';

/**
 * GET /api/talents/[id]/contact-access
 * Get talent contact info with permission check.
 * Returns masked contact if no permission, full contact if permitted.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorId = await resolveCurrentActor();
    if (!actorId) {
      return apiSuccess({
        hasAccess: false,
        contact: { phone: '—', email: '—', wechat: '—' },
        reason: 'UNAUTHENTICATED',
      });
    }

    const { id: talentId } = await params;
    const supabase = getSupabaseAdminUntyped();

    // Try to get contact with context via RPC
    const { data, error } = await supabase.rpc('get_talent_contact_with_context', {
      p_talent_id: talentId,
      p_actor_id: actorId,
    } as Record<string, string>);

    if (error) {
      // If RPC returns CONTACT_ACCESS_DENIED, return masked contact
      if (error.message?.includes('CONTACT_ACCESS_DENIED')) {
        // Fetch talent without contact info
        const { data: talent } = await supabase
          .from('talents')
          .select('id, full_name, phone, email, wechat')
          .eq('id', talentId)
          .single();

        if (!talent) {
          return apiSuccess({
            hasAccess: false,
            contact: { phone: '—', email: '—', wechat: '—' },
            reason: 'TALENT_NOT_FOUND',
          });
        }

        return apiSuccess({
          hasAccess: false,
          contact: maskTalentContact(talent as Record<string, string | null>),
          reason: 'ACCESS_DENIED',
        });
      }
      throw error;
    }

    // RPC returned data — user has access
    return apiSuccess({
      hasAccess: true,
      contact: data,
    });
  } catch (error) {
    return catchApiErrors(error);
  }
}

/**
 * POST /api/talents/[id]/contact-access
 * Request access to talent contact info.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actorId = await resolveCurrentActor();
    if (!actorId) {
      return apiSuccess({ success: false, error: 'UNAUTHENTICATED' });
    }

    const { id: talentId } = await params;
    const body = await request.json();
    const reason = body.reason || '';

    const supabase = getSupabaseAdminUntyped();

    const { data, error } = await supabase.rpc('request_talent_contact_access', {
      p_talent_id: talentId,
      p_actor_id: actorId,
      p_reason: reason,
    } as Record<string, string>);

    if (error) {
      throw error;
    }

    return apiSuccess(data);
  } catch (error) {
    return catchApiErrors(error);
  }
}

/**
 * PATCH /api/talents/[id]/contact-access
 * Approve or reject a pending contact access request.
 * Requires talent_contact_read permission (Team Lead / Super Admin).
 *
 * Body: { request_id: string, decision: 'approve' | 'reject', expires_at?: string }
 * RPC: decide_talent_contact_access(p_request_id, p_actor_id, approved, rejected, p_expires_at)
 */
export async function PATCH(
  request: NextRequest,
  _params: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission('talent_contact_read');
    const actorId = await resolveCurrentActor();
    if (!actorId) {
      return apiSuccess({ success: false, error: 'UNAUTHENTICATED' });
    }

    const body = await request.json();
    const { request_id, decision, expires_at } = body as {
      request_id?: string;
      decision?: 'approve' | 'reject';
      expires_at?: string;
    };

    if (!request_id) {
      return apiSuccess({ success: false, error: 'MISSING_REQUEST_ID' });
    }
    if (!decision || !['approve', 'reject'].includes(decision)) {
      return apiSuccess({ success: false, error: 'INVALID_DECISION' });
    }

    const supabase = getSupabaseAdminUntyped();

    const rpcParams: Record<string, unknown> = {
      p_request_id: request_id,
      p_actor_id: actorId,
      approved: decision === 'approve',
      rejected: decision === 'reject',
    };
    if (expires_at) {
      rpcParams.p_expires_at = expires_at;
    }

    const { data, error } = await supabase.rpc('decide_talent_contact_access', rpcParams);

    if (error) {
      throw error;
    }

    return apiSuccess(data ?? { success: true, decision, request_id });
  } catch (error) {
    return catchApiErrors(error);
  }
}
