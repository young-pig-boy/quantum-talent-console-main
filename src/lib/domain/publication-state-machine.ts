/**
 * JobPublication State Machine
 *
 * Legal transitions:
 *   draft     → published
 *   published → offline
 *   offline   → published
 *   draft     → archived
 *   offline   → archived
 *   published → archived  (must go offline first in business logic, but allowed here if forced)
 */

import type { PublicationStatus } from '@/lib/domain/types';
import { InvalidStateTransitionError } from '@/lib/domain/errors';

const PUBLICATION_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  draft: ['published', 'archived'],
  published: ['offline', 'archived'],
  offline: ['published', 'archived'],
  archived: [],
};

export function canTransitionPublication(
  from: PublicationStatus,
  to: PublicationStatus
): boolean {
  const allowed = PUBLICATION_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function transitionPublication(
  from: PublicationStatus,
  to: PublicationStatus
): PublicationStatus {
  if (!canTransitionPublication(from, to)) {
    throw new InvalidStateTransitionError('JobPublication', from, to);
  }
  return to;
}

export function getValidPublicationTransitions(
  from: PublicationStatus
): PublicationStatus[] {
  return PUBLICATION_TRANSITIONS[from] ?? [];
}
