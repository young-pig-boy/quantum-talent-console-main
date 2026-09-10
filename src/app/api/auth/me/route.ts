import { NextResponse } from 'next/server';
import { resolveActorContext } from '@/server/auth/guard';

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's full context.
 * Response format:
 *   {
 *     authenticated: true,
 *     role: 'super_admin' | 'team_lead' | 'internal_consultant',
 *     is_break_glass: boolean,
 *     profile: Profile,
 *     teams: Team[],
 *     permissions: string[]
 *   }
 *
 * Returns 401 if not authenticated via either path.
 */
export async function GET() {
  const ctx = await resolveActorContext();

  if (!ctx) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    role: ctx.profile.role,
    is_break_glass: ctx.is_break_glass,
    profile: ctx.profile,
    teams: ctx.teams,
    permissions: ctx.permissions,
  });
}
