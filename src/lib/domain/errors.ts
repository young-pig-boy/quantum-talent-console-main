/**
 * Unified business error codes for the Quantum Talent Console.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  DUPLICATE_TALENT: 'DUPLICATE_TALENT',
  DUPLICATE_APPLICATION: 'DUPLICATE_APPLICATION',
  PUBLICATION_NOT_PUBLISHED: 'PUBLICATION_NOT_PUBLISHED',
  COMPANY_HAS_JOBS: 'COMPANY_HAS_JOBS',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class BusinessError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, details?: unknown) {
    super(ErrorCodes.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, id?: string | number) {
    const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(ErrorCodes.NOT_FOUND, msg);
    this.name = 'NotFoundError';
  }
}

export class InvalidStateTransitionError extends BusinessError {
  constructor(resource: string, from: string, to: string) {
    super(
      ErrorCodes.INVALID_STATE_TRANSITION,
      `Invalid ${resource} transition: ${from} → ${to}`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class DuplicateTalentError extends BusinessError {
  constructor(existingTalentId: string) {
    super(ErrorCodes.DUPLICATE_TALENT, 'Duplicate candidate detected', {
      existingTalentId,
    });
    this.name = 'DuplicateTalentError';
  }
}

export class ConfigError extends BusinessError {
  constructor(message: string) {
    super(ErrorCodes.CONFIGURATION_ERROR, message);
    this.name = 'ConfigError';
  }
}

/**
 * Thrown by requireAuth() when the caller is not authenticated or not authorized.
 * Includes the HTTP status code so route handlers can return the correct response.
 *
 * IMPORTANT: This is thrown (not returned), so it CANNOT be accidentally ignored
 * like the old requireAuth() which returned a NextResponse that routes discarded.
 */
export class AuthError extends BusinessError {
  public readonly httpStatus: number;

  constructor(message: string, httpStatus: number = 401) {
    super(httpStatus === 403 ? ErrorCodes.FORBIDDEN : ErrorCodes.UNAUTHORIZED, message);
    this.name = 'AuthError';
    this.httpStatus = httpStatus;
  }
}

/**
 * Thrown when the caller is authenticated but lacks the required permission.
 * Always returns 403.
 */
export class ForbiddenError extends BusinessError {
  constructor(code: string, message: string) {
    super(ErrorCodes.FORBIDDEN, message, { code });
    this.name = 'ForbiddenError';
  }
}
