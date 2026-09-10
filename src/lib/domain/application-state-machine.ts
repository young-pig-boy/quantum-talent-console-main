/**
 * Application State Machine
 *
 * Main chain:
 *   matching → contacting → interested → recommended
 *   → client_review → interview → offer → hired
 *
 * Rejections (from any active stage to rejected):
 *   matching → rejected
 *   contacting → rejected
 *   interested → rejected
 *   recommended → rejected
 *   client_review → rejected
 *   interview → rejected
 *
 * Withdrawals:
 *   contacting → withdrawn
 *   interested → withdrawn
 *   interview → withdrawn
 *   offer → withdrawn
 */

import type { ApplicationStage } from '@/lib/domain/types';
import { InvalidStateTransitionError } from '@/lib/domain/errors';

const APPLICATION_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  matching: ['contacting', 'rejected'],
  contacting: ['interested', 'rejected', 'withdrawn'],
  interested: ['recommended', 'rejected', 'withdrawn'],
  recommended: ['client_review', 'rejected'],
  client_review: ['interview', 'rejected'],
  interview: ['offer', 'rejected', 'withdrawn'],
  offer: ['hired', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionApplication(
  from: ApplicationStage,
  to: ApplicationStage
): boolean {
  const allowed = APPLICATION_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function transitionApplication(
  from: ApplicationStage,
  to: ApplicationStage
): ApplicationStage {
  if (!canTransitionApplication(from, to)) {
    throw new InvalidStateTransitionError('Application', from, to);
  }
  return to;
}

export function getValidApplicationTransitions(
  from: ApplicationStage
): ApplicationStage[] {
  return APPLICATION_TRANSITIONS[from] ?? [];
}

/** Human-readable action label for a forward transition. */
const FORWARD_ACTION_LABELS: Partial<Record<ApplicationStage, string>> = {
  contacting: '进入联系阶段',
  interested: '标记候选人有意向',
  recommended: '推荐给客户',
  client_review: '进入客户评估',
  interview: '进入面试',
  offer: '进入 Offer',
  hired: '确认入职',
};

export function getApplicationTransitionActionLabel(
  from: ApplicationStage,
  to: ApplicationStage
): string {
  if (to === 'rejected') return '标记拒绝';
  if (to === 'withdrawn') return '候选人退出';
  return FORWARD_ACTION_LABELS[to] ?? `推进到 ${to}`;
}

export function isTerminalApplicationStage(
  stage: ApplicationStage
): boolean {
  return stage === 'hired' || stage === 'rejected' || stage === 'withdrawn';
}
