import { NextRequest } from 'next/server';
import { ApplicationService } from '@/server/services/application.service';
import { requireAuth, resolveCurrentActor } from '@/server/auth/guard';
import { apiSuccess, apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import type { ApplicationFilters } from '@/lib/domain/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);
    const { searchParams } = new URL(request.url);
    const result = await ApplicationService.listApplications({
      job_id: searchParams.get('job_id') ?? undefined,
      talent_id: searchParams.get('talent_id') ?? undefined,
      company_id: searchParams.get('company_id') ?? undefined,
      stage: searchParams.get('stage') ?? undefined,
      owner_id: searchParams.get('owner_id') ?? undefined,
      due_before: searchParams.get('due_before') ?? undefined,
      due_after: searchParams.get('due_after') ?? undefined,
      order_by: (searchParams.get('order_by') as ApplicationFilters['order_by']) ?? undefined,
      order: (searchParams.get('order') as ApplicationFilters['order']) ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });
    return apiSuccess(result);
  } catch (e) {
    return catchApiErrors(e);
  }
}

/**
 * POST /api/applications
 *
 * Create a new Application.
 *
 * Client input (trust boundary):
 *   - talent_id, job_id, owner_id (business field), stage
 *
 * Server-resolved (NOT trusted from client):
 *   - actorId: authenticated user UUID via resolveCurrentActor()
 *
 * The actorId is passed through to ApplicationRepository.createWithContext()
 * which will relay it to the Supabase RPC for StageEvent generation.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) return apiError('CONFIGURATION_ERROR', 'Supabase is not configured', 500);

    // Resolve actor server-side — never trust client-provided actorId/createdBy
    const actorId = await resolveCurrentActor();
    if (!actorId) return apiError('UNAUTHORIZED', 'Authentication required', 401);

    const body = await request.json();
    const application = await ApplicationService.createApplication(body, actorId);
    return apiSuccess(application, 201);
  } catch (e) {
    return catchApiErrors(e);
  }
}
