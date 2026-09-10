import { NextResponse } from 'next/server';
import { AuthError, BusinessError, ConfigError, ForbiddenError, NotFoundError } from '@/lib/domain/errors';
import type { ApiResponse, ApiErrorResponse } from '@/lib/domain/types';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, details } } satisfies ApiErrorResponse,
    { status }
  );
}

export function apiNotFound(resource: string, id?: string | number) {
  const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
  return apiError('NOT_FOUND', msg, 404);
}

export function apiValidationError(message: string, details?: unknown) {
  return apiError('VALIDATION_ERROR', message, 400, details);
}

export function apiConfigError() {
  return apiError(
    'CONFIGURATION_ERROR',
    'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
    500
  );
}

/**
 * Universal error handler for API route catch blocks.
 *
 * Maps thrown errors to the correct NextResponse:
 *   AuthError        → 401/403 with error code
 *   ConfigError      → 500 CONFIGURATION_ERROR
 *   BusinessError    → 400 with error code
 *   everything else  → 500 DATABASE_ERROR
 *
 * Usage in route handlers:
 *   try {
 *     const profile = await requireAuth(); // throws AuthError on failure
 *     // ... business logic
 *   } catch (e) {
 *     return catchApiErrors(e);
 *   }
 */
export function catchApiErrors(e: unknown): NextResponse {
  if (e instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: { code: e.code, message: e.message } },
      { status: e.httpStatus }
    );
  }
  if (e instanceof ConfigError) {
    return apiError('CONFIGURATION_ERROR', e.message || 'Supabase is not configured', 500);
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: e.message } },
      { status: 403 },
    );
  }
  if (e instanceof NotFoundError) {
    return apiError('NOT_FOUND', e.message, 404);
  }
  if (e instanceof BusinessError) {
    return apiError(e.code, e.message, 400, e.details);
  }
  // Unknown errors: fail safe — don't leak internal details in production
  const message = e instanceof Error ? e.message : 'An unexpected error occurred';
  return apiError('INTERNAL_ERROR', message, 500);
}
