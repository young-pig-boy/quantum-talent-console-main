/**
 * Lead State Machine
 *
 * Legal transitions:
 *   new       → reviewed
 *   new       → invalid
 *   reviewed  → contacting
 *   contacting → qualified
 *   qualified → converted
 *   reviewed  → invalid
 *   contacting → invalid
 */

import type { LeadStatus } from '@/lib/domain/types';
import { InvalidStateTransitionError } from '@/lib/domain/errors';

const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['reviewed', 'invalid'],
  reviewed: ['contacting', 'invalid'],
  contacting: ['qualified', 'invalid'],
  qualified: ['converted'],
  converted: [],
  invalid: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  const allowed = LEAD_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function transitionLead(from: LeadStatus, to: LeadStatus): LeadStatus {
  if (!canTransitionLead(from, to)) {
    throw new InvalidStateTransitionError('Lead', from, to);
  }
  return to;
}

export function getValidLeadTransitions(from: LeadStatus): LeadStatus[] {
  return LEAD_TRANSITIONS[from] ?? [];
}
