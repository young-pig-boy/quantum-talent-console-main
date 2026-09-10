/**
 * Publication 领域规则（赛道 / 急招 / 精选 / 状态）
 *
 * 这些规则是 Console 侧可发布 / 可急招判断的唯一权威，
 * 供 Service 层与 UI 层复用，避免业务规则散落在 JSX 中。
 */
import type { JobPublication } from '@/lib/domain/types';
import { isQuantumTrack } from '@/lib/domain/quantum-tracks';

/**
 * 是否可以发布：track 为空（未归类）或属于四大赛道之一。
 * track 存在但不属于四大赛道 → 不可发布（脏赛道）。
 * 其余字段（title/slug/responsibilities/site_id）校验保留在 Service 层。
 */
export function hasValidTrack(pub: Pick<JobPublication, 'track'>): boolean {
  if (!pub.track) return true;
  return isQuantumTrack(pub.track);
}

/**
 * 是否可以开启急招：仅 published 状态允许。
 */
export function canEnableUrgent(pub: Pick<JobPublication, 'status'>): boolean {
  return pub.status === 'published';
}

/**
 * 急招是否处于"有效"状态：已开启、已发布、且未到期。
 */
export function isUrgentActive(
  pub: Pick<JobPublication, 'urgent' | 'status' | 'urgent_expires_at'>,
  now: Date = new Date()
): boolean {
  if (!pub.urgent || pub.status !== 'published') return false;
  if (!pub.urgent_expires_at) return true; // 未设置截止时间，视为持续有效
  return new Date(pub.urgent_expires_at).getTime() > now.getTime();
}

/**
 * 急招是否已到期：已开启且设置了截止时间且截止时间已过。
 */
export function isUrgentExpired(
  pub: Pick<JobPublication, 'urgent' | 'urgent_expires_at'>,
  now: Date = new Date()
): boolean {
  if (!pub.urgent || !pub.urgent_expires_at) return false;
  return new Date(pub.urgent_expires_at).getTime() <= now.getTime();
}
