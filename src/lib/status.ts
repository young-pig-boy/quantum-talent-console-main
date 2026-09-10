/**
 * 统一状态映射
 * 所有业务状态的中文标签、样式、排序都在这里管理，避免散落在页面里。
 */

export type StatusOption = { value: string; label: string; className: string };

function makeBadge(base: string): string {
  return `inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${base}`;
}

// === Job 状态 ===
export const JOB_STATUSES: StatusOption[] = [
  { value: 'draft', label: '草稿', className: makeBadge('bg-muted text-muted-foreground') },
  { value: 'recruiting', label: '招聘中', className: makeBadge('bg-emerald-50 text-emerald-700') },
  { value: 'paused', label: '暂停', className: makeBadge('bg-amber-50 text-amber-700') },
  { value: 'closed', label: '已关闭', className: makeBadge('bg-destructive/10 text-destructive') },
  { value: 'archived', label: '已归档', className: makeBadge('bg-muted text-muted-foreground') },
];

export function getJobStatus(value: string | undefined): StatusOption {
  return JOB_STATUSES.find((s) => s.value === value) ?? { value: value ?? '', label: value ?? '-', className: makeBadge('bg-muted text-muted-foreground') };
}

// === Publication 状态 ===
export const PUBLICATION_STATUSES: StatusOption[] = [
  { value: 'draft', label: '草稿', className: makeBadge('bg-muted text-muted-foreground') },
  { value: 'published', label: '已发布', className: makeBadge('bg-emerald-50 text-emerald-700') },
  { value: 'offline', label: '已下架', className: makeBadge('bg-amber-50 text-amber-700') },
  { value: 'archived', label: '已归档', className: makeBadge('bg-destructive/10 text-destructive') },
];

export function getPublicationStatus(value: string | undefined): StatusOption {
  return PUBLICATION_STATUSES.find((s) => s.value === value) ?? { value: value ?? '', label: value ?? '-', className: makeBadge('bg-muted text-muted-foreground') };
}

// === Lead 状态 ===
export const LEAD_STATUSES: StatusOption[] = [
  { value: 'new', label: 'New', className: makeBadge('bg-blue-50 text-blue-700') },
  { value: 'reviewed', label: '已查看', className: makeBadge('bg-muted text-muted-foreground') },
  { value: 'contacting', label: '联系中', className: makeBadge('bg-amber-50 text-amber-700') },
  { value: 'qualified', label: '已确认', className: makeBadge('bg-emerald-50 text-emerald-700') },
  { value: 'converted', label: '已转化', className: makeBadge('bg-primary/10 text-primary') },
  { value: 'invalid', label: '无效', className: makeBadge('bg-destructive/10 text-destructive') },
];

export function getLeadStatus(value: string | undefined): StatusOption {
  return LEAD_STATUSES.find((s) => s.value === value) ?? { value: value ?? '', label: value ?? '-', className: makeBadge('bg-muted text-muted-foreground') };
}

// === Application / Pipeline 阶段 ===
export const APPLICATION_STAGES: StatusOption[] = [
  { value: 'matching', label: '匹配', className: makeBadge('bg-muted text-muted-foreground') },
  { value: 'contacting', label: '联系中', className: makeBadge('bg-blue-50 text-blue-700') },
  { value: 'interested', label: '有意向', className: makeBadge('bg-amber-50 text-amber-700') },
  { value: 'recommended', label: '已推荐', className: makeBadge('bg-primary/10 text-primary') },
  { value: 'client_review', label: '客户评估', className: makeBadge('bg-purple-50 text-purple-700') },
  { value: 'interview', label: '面试', className: makeBadge('bg-indigo-50 text-indigo-700') },
  { value: 'offer', label: 'Offer', className: makeBadge('bg-emerald-50 text-emerald-700') },
  { value: 'hired', label: '已入职', className: makeBadge('bg-emerald-50 text-emerald-800') },
  { value: 'rejected', label: '已拒绝', className: makeBadge('bg-destructive/10 text-destructive') },
  { value: 'withdrawn', label: '已撤回', className: makeBadge('bg-muted text-muted-foreground') },
];

export function getApplicationStage(value: string | undefined): StatusOption {
  return APPLICATION_STAGES.find((s) => s.value === value) ?? { value: value ?? '', label: value ?? '-', className: makeBadge('bg-muted text-muted-foreground') };
}

/** Alias for components that want a label helper. */
export function getApplicationStageLabel(value: string | undefined): string {
  return getApplicationStage(value).label;
}

export const PIPELINE_STAGE_ORDER = APPLICATION_STAGES.map((s) => s.value);

// === Company 合作状态 ===
export const COMPANY_STATUSES: StatusOption[] = [
  { value: 'active', label: '合作中', className: makeBadge('bg-emerald-50 text-emerald-700') },
  { value: 'inactive', label: '暂停', className: makeBadge('bg-muted text-muted-foreground') },
];

export function getCompanyStatus(value: string | undefined): StatusOption {
  return COMPANY_STATUSES.find((s) => s.value === value) ?? { value: value ?? '', label: value ?? '-', className: makeBadge('bg-muted text-muted-foreground') };
}
