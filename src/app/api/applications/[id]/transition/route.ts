import { NextRequest } from 'next/server';
import { ApplicationService } from '@/server/services/application.service';
import { resolveCurrentActor, requireCanManageApplication } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';

/**
 * POST /api/applications/[id]/transition
 *
 * Transition an Application to a new stage.
 *
 * Client input (trust boundary):
 *   - to_stage: target stage (validated by state machine)
 *   - note: optional business note
 *
 * Server-resolved (NOT trusted from client):
 *   - actorId: authenticated user UUID via resolveCurrentActor()
 *
 * The actorId / note are passed through to ApplicationRepository.transitionWithContext()
 * which relays them to the Supabase RPC for StageEvent generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);

    // Resolve actor server-side — never trust client-provided actorId/createdBy
    const actorId = await resolveCurrentActor();
    if (!actorId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await params;
    await requireCanManageApplication(id);
    const body = await request.json();

    // Only trust to_stage and note from the client
    const app = await ApplicationService.transitionStage(id, body, actorId);
    return apiSuccess(app);
  } catch (e) {
    return catchApiErrors(e);
  }
}
