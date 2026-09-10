/**
 * Job State Machine
 *
 * Legal transitions:
 *   draft     → recruiting
 *   recruiting → paused
 *   paused    → recruiting
 *   recruiting → closed
 *   paused    → closed
 *   closed    → archived
 */

import type { JobStatus } from '@/lib/domain/types';
import { InvalidStateTransitionError } from '@/lib/domain/errors';

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['recruiting'],
  recruiting: ['paused', 'closed'],
  paused: ['recruiting', 'closed'],
  closed: ['archived'],
  archived: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  const allowed = JOB_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function transitionJob(from: JobStatus, to: JobStatus): JobStatus {
  if (!canTransitionJob(from, to)) {
    throw new InvalidStateTransitionError('Job', from, to);
  }
  return to;
}

export function getValidJobTransitions(from: JobStatus): JobStatus[] {
  return JOB_TRANSITIONS[from] ?? [];
}
