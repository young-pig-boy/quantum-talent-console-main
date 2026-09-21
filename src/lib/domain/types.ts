// Database-level types that mirror the PostgreSQL schema.
// These will be used by Drizzle ORM and Supabase typed clients.

/** Internal role model — super_admin / team_lead / internal_consultant */
export type InternalRole = 'super_admin' | 'team_lead' | 'internal_consultant';

/** User profile linked to auth.users */
export interface Profile {
  id: string;
  /** Real DB column: full_name (profiles.full_name) */
  full_name: string;
  role: InternalRole;
  status: 'active' | 'inactive';
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Team — organizational unit */
export interface Team {
  id: string;
  name: string;
  lead_id: string;
  parent_team_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/** TeamMembership — profile ↔ team relation */
export interface TeamMembership {
  id: string;
  team_id: string;
  profile_id: string;
  is_primary: boolean;
  status: 'active' | 'inactive';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

/** PermissionDefinition — available permission keys */
export interface PermissionDefinition {
  permission_key: string;
  name: string;
  description: string;
  delegatable: boolean;
  risk_level: 'normal' | 'sensitive' | 'high';
  created_at: string;
}

/** PermissionGrant — granted permission to a user */
export interface PermissionGrant {
  id: string;
  grantee_id: string;
  permission_key: string;
  resource_type: string | null;
  resource_id: string | null;
  granted_by: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** AuditLog — operation audit trail */
export interface AuditLog {
  id: string;
  actor_kind: 'internal' | 'external' | 'system';
  actor_profile_id: string | null;
  actor_external_consultant_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** ContactAccessRequest — talent contact access workflow */
export interface ContactAccessRequest {
  id: string;
  talent_id: string;
  requester_id: string;
  approver_id: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  expires_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** ExternalConsultant — external collaborator */
export interface ExternalConsultant {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  organization: string | null;
  phone: string | null;
  email: string | null;
  status: 'invited' | 'active' | 'inactive';
  invited_by: string;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** ExternalJobAccess — job access for external consultants */
export interface ExternalJobAccess {
  id: string;
  external_consultant_id: string;
  job_id: string;
  granted_by: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** ExternalReferral — external consultant referral */
export interface ExternalReferral {
  id: string;
  external_consultant_id: string;
  job_id: string;
  lead_id: string | null;
  application_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** ActorContext — resolved identity + permissions for the current request */
export interface ActorContext {
  profile: Profile;
  teams: Team[];
  permissions: string[];
  is_break_glass: boolean;
}

/** Known permission keys */
export type PermissionKey =
  | 'team_data_read'
  | 'team_progress_manage'
  | 'publication_edit'
  | 'publication_publish'
  | 'publication_operate'
  | 'showcase_analytics'
  | 'talent_contact_read'
  | 'external_collaboration_manage';

export const PERMISSION_KEYS: PermissionKey[] = [
  'team_data_read',
  'team_progress_manage',
  'publication_edit',
  'publication_publish',
  'publication_operate',
  'showcase_analytics',
  'talent_contact_read',
  'external_collaboration_manage',
];

/** Site represents a public-facing talent website */
export interface Site {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/** Company — client organization (mirrors live Supabase public.companies) */
export interface Company {
  id: string;
  name: string;
  display_name: string;
  industry: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/** Internal Job (招聘岗位) */
export type JobStatus = 'draft' | 'recruiting' | 'paused' | 'closed' | 'archived';

/** Internal operational metadata stored in jobs.intake_metadata JSONB */
export interface IntakeMetadata {
  source_id?: string;
  priority?: string;
  publish_wave?: number;
  duplicate_group?: string;
  source_file?: string;
  publication_status?: string;
}

export interface Job {
  id: string;
  /** 岗位编码（业务识别码，DB 自动生成，创建后不可修改） e.g. QJ-26-0001 */
  job_code: string;
  company_id: string;
  owner_id: string;
  title: string;
  city: string;
  /** Domain: salary_internal → DB: internal_salary */
  salary_internal: string | null;
  /** Domain: jd → DB: original_jd */
  jd?: string | null;
  hard_requirements: string | null;
  exclusion_rules: string | null;
  internal_notes: string | null;
  intake_metadata: IntakeMetadata | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

/** Public Job Publication (对外展示岗位) — domain names map to live DB below */
export type PublicationStatus = 'draft' | 'published' | 'offline' | 'archived';

export interface JobPublication {
  id: string;
  /** 公开岗位编码（自动继承对应 jobs.job_code，不允许人工修改） */
  public_job_code: string;
  job_id: string;
  site_id: string;
  /** Domain: title → DB: public_title */
  title: string;
  /** English title → DB: public_title_en（空则前台英文模式回落中文） */
  title_en: string | null;
  /** Domain: company_display_name → DB: public_company_name */
  company_display_name: string;
  city: string;
  salary_display: string | null;
  salary_display_en: string | null;
  summary: string | null;
  summary_en: string | null;
  responsibilities: string | null;
  responsibilities_en: string | null;
  requirements: string | null;
  requirements_en: string | null;
  /** Domain: education_requirement → DB: education */
  education_requirement: string | null;
  /** English education → DB: education_en（空则前台英文模式回落映射表 → 中文） */
  education_en: string | null;
  /** Domain: experience_requirement → DB: experience */
  experience_requirement: string | null;
  /** English experience → DB: experience_en（空则前台英文模式回落映射表 → 中文） */
  experience_en: string | null;
  track: string | null;
  direction: string | null;
  direction_en: string | null;
  seniority: string | null;
  seniority_en: string | null;
  tags: string[] | null;
  /** English tags（JSON 字符串数组文本，与 tags 同构；空则前台英文模式回落中文标签） */
  tags_en: string | null;
  urgent: boolean;
  urgent_started_at: string | null;
  urgent_expires_at: string | null;
  featured: boolean;
  slug: string;
  status: PublicationStatus;
  published_at: string | null;
  offline_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Batch operation (bulk publish / bulk offline) result */
export type BatchOperationStatus = 'success' | 'skipped' | 'failed';

export interface BatchOperationItemResult {
  id: string;
  status: BatchOperationStatus;
  message: string;
}

export interface BatchOperationResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  results: BatchOperationItemResult[];
}

/** Lead — candidate application before being confirmed as talent */
export type LeadStatus = 'new' | 'reviewed' | 'contacting' | 'qualified' | 'converted' | 'invalid';

export interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  site_id: string;
  publication_id: string;
  source_channel: string | null;
  source_detail: string | null;
  resume_url: string | null;
  status: LeadStatus;
  invalid_reason: string | null;
  notes: string | null;
  owner_id: string | null;
  converted_talent_id: string | null;
  reviewed_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Talent — confirmed candidate in talent pool */
export interface Talent {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  current_company: string | null;
  current_title: string | null;
  city: string | null;
  education_summary: string | null;
  experience_years: number | null;
  resume_url: string | null;
  source_channel: string | null;
  tags: string[];
  notes: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Talent without PII (phone/email/wechat) — safe for regular API responses */
export type TalentSafeDTO = Omit<Talent, 'phone' | 'email' | 'wechat'>;

/** Strip PII fields from a Talent object */
export function stripTalentPII(talent: Talent): TalentSafeDTO {
  const { phone: _phone, email: _email, wechat: _wechat, ...safe } = talent;
  return safe;
}

/** Application — Talent × Job relation */
export type ApplicationStage =
  | 'matching'
  | 'contacting'
  | 'interested'
  | 'recommended'
  | 'client_review'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface Application {
  id: string;
  talent_id: string;
  job_id: string;
  owner_id: string | null;
  stage: ApplicationStage;
  client_feedback: string | null;
  interview_notes: string | null;
  offer_summary: string | null;
  rejection_reason: string | null;
  withdrawal_reason: string | null;
  recommended_at: string | null;
  offer_at: string | null;
  hired_at: string | null;
  next_action_at: string | null;
  last_stage_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** StageEvent — audit trail of Application stage changes */
export interface StageEvent {
  id: string;
  application_id: string;
  from_stage: string | null;
  to_stage: string;
  event_type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** AnalyticsEvent — tracking data for public site */
export type AnalyticsEventType =
  | 'job_impression'
  | 'job_view'
  | 'share'
  | 'contact_click'
  | 'apply_start'
  | 'apply_submit';

export interface AnalyticsEvent {
  id: string;
  site_id: string | null;
  publication_id: string | null;
  lead_id: string | null;
  event_type: AnalyticsEventType;
  source_channel: string | null;
  session_id: string | null;
  referrer: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

// ---- DTOs ----

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

// ---- Filter & Query types ----

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface CompanyFilters extends PaginationParams {
  keyword?: string;
  status?: string;
}

export interface JobFilters extends PaginationParams {
  keyword?: string;
  company_id?: string;
  status?: string;
  city?: string;
  owner_id?: string;
}

export interface PublicationFilters extends PaginationParams {
  keyword?: string;
  status?: string;
  track?: string;
  city?: string;
  site_id?: string;
  job_id?: string;
  featured?: string;
}

export interface LeadFilters extends PaginationParams {
  keyword?: string;
  status?: string;
  source_channel?: string;
  publication_id?: string;
  owner_id?: string;
}

export interface TalentFilters extends PaginationParams {
  keyword?: string;
  current_company?: string;
  current_title?: string;
  city?: string;
  source_channel?: string;
  owner_id?: string;
  tags?: string;
}

export interface ApplicationFilters extends PaginationParams {
  job_id?: string;
  talent_id?: string;
  company_id?: string;
  stage?: string;
  owner_id?: string;
  due_before?: string;
  due_after?: string;
  order_by?: 'next_action_at' | 'updated_at' | 'created_at';
  order?: 'asc' | 'desc';
}

// ---- Analytics Types ----

export interface DashboardSummary {
  recruitingJobs: number;
  publishedJobs: number;
  newLeads: number;
  pendingContacts: number;
  recommended: number;
  interviews: number;
  offers: number;
  hired: number;
  recentApplications: number;
  recentLeads: number;
  overdueActions: number;
  upcomingActions: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number | null;
}

export type RecruitmentFunnel = FunnelStage[];

export interface SourceDistribution {
  channel: string;
  count: number;
  percentage: number;
}

export interface JobRecruitmentMetrics {
  jobId: string;
  applications: number;
  recommended: number;
  clientReview: number;
  interview: number;
  offer: number;
  hired: number;
  rejected: number;
  withdrawn: number;
}

export interface PublicationMetrics {
  publicationId: string;
  impressions: number;
  views: number;
  shares: number;
  contactClicks: number;
  applyStarts: number;
  applySubmits: number;
  viewRate: number;
  applyRate: number;
}

// ---- Input Types for Create/Update operations ----

export interface CreateCompanyInput {
  name: string;
  display_name: string;
  industry?: string;
  description?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  display_name?: string;
  industry?: string;
  description?: string;
  status?: string;
}

export interface CreateJobInput {
  company_id: string;
  owner_id?: string | null;
  title: string;
  city?: string;
  jd?: string;
  salary_internal?: string;
  hard_requirements?: string;
  exclusion_rules?: string;
  internal_notes?: string;
  intake_metadata?: IntakeMetadata;
}

export interface UpdateJobInput {
  title?: string;
  city?: string;
  jd?: string;
  salary_internal?: string;
  hard_requirements?: string;
  exclusion_rules?: string;
  internal_notes?: string;
  intake_metadata?: IntakeMetadata;
}

export interface CreateLeadInput {
  full_name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  site_id?: string;
  publication_id?: string;
  source_channel?: string;
  source_detail?: string;
  resume_url?: string;
  notes?: string;
}

export interface UpdateLeadInput {
  full_name?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  source_channel?: string;
  source_detail?: string;
  resume_url?: string;
  notes?: string;
  owner_id?: string;
}

export interface CreateTalentInput {
  full_name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  current_company?: string;
  current_title?: string;
  city?: string;
  education_summary?: string;
  experience_years?: number;
  resume_url?: string;
  source_channel?: string;
  tags?: string[];
  notes?: string;
  owner_id?: string;
}

export interface UpdateTalentInput {
  full_name?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  current_company?: string;
  current_title?: string;
  city?: string;
  education_summary?: string;
  experience_years?: number;
  resume_url?: string;
  source_channel?: string;
  tags?: string[];
  notes?: string;
  owner_id?: string;
}

export interface CreatePublicationInput {
  job_id: string;
  site_id: string;
  title: string;
  title_en?: string;
  company_display_name?: string;
  city?: string;
  salary_display?: string;
  salary_display_en?: string;
  summary?: string;
  summary_en?: string;
  responsibilities?: string;
  responsibilities_en?: string;
  requirements?: string;
  requirements_en?: string;
  education_requirement?: string;
  education_en?: string;
  experience_requirement?: string;
  experience_en?: string;
  track?: string;
  direction?: string;
  direction_en?: string;
  seniority?: string;
  seniority_en?: string;
  tags?: string[];
  tags_en?: string;
  urgent?: boolean;
  urgent_started_at?: string | null;
  urgent_expires_at?: string | null;
  featured?: boolean;
  slug: string;
}

export interface UpdatePublicationInput {
  title?: string;
  title_en?: string;
  company_display_name?: string;
  city?: string;
  salary_display?: string;
  salary_display_en?: string;
  summary?: string;
  summary_en?: string;
  responsibilities?: string;
  responsibilities_en?: string;
  requirements?: string;
  requirements_en?: string;
  education_requirement?: string;
  education_en?: string;
  experience_requirement?: string;
  experience_en?: string;
  track?: string;
  direction?: string;
  direction_en?: string;
  seniority?: string;
  seniority_en?: string;
  tags?: string[];
  tags_en?: string;
  urgent?: boolean;
  urgent_started_at?: string | null;
  urgent_expires_at?: string | null;
  featured?: boolean;
  slug?: string;
}

export interface CreateApplicationInput {
  talent_id: string;
  job_id: string;
  owner_id?: string | null;
  stage?: ApplicationStage;
}

/**
 * Application PATCH input — only non-stage metadata fields.
 * Stage changes MUST go through TransitionApplicationInput.
 */
export interface UpdateApplicationInput {
  next_action_at?: string | null;
}

export interface TransitionApplicationInput {
  to_stage: ApplicationStage;
  note?: string;
}

/**
 * Transition context passed through the server-side layers.
 * Contains all data needed to perform a stage transition, including
 * the server-resolved actor (NOT client-provided).
 *
 * Next phase: the Repository will replace its internal UPDATE with
 * supabase.rpc('transition_application_stage', { ...this }).
 */
export interface TransitionWithContextParams {
  applicationId: string;
  toStage: ApplicationStage;
  actorId: string | null;
  note: string | null;
}

/**
 * Create context passed through the server-side layers.
 * Contains the application data plus the server-resolved actor.
 *
 * Next phase: the Repository will replace its internal INSERT with
 * supabase.rpc('create_application_with_context', { ...this }).
 */
export interface CreateApplicationWithContextParams {
  applicationData: CreateApplicationInput;
  actorId: string | null;
}

// Public API DTOs
export interface PublicJobSummary {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  company_display_name: string;
  city: string;
  salary_display: string | null;
  salary_display_en: string | null;
  summary: string | null;
  summary_en: string | null;
  track: string | null;
  direction: string | null;
  direction_en: string | null;
  seniority: string | null;
  seniority_en: string | null;
  tags: string[] | null;
  /** English tags（JSON 字符串数组文本，与 tags 同构；空则前台英文模式回落中文标签） */
  tags_en: string | null;
  urgent: boolean;
  urgent_started_at: string | null;
  urgent_expires_at: string | null;
  featured: boolean;
  published_at: string | null;
}

export interface PublicJobDetail {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  company_display_name: string;
  city: string;
  salary_display: string | null;
  salary_display_en: string | null;
  summary: string | null;
  summary_en: string | null;
  responsibilities: string | null;
  responsibilities_en: string | null;
  requirements: string | null;
  requirements_en: string | null;
  education_requirement: string | null;
  education_en: string | null;
  experience_requirement: string | null;
  experience_en: string | null;
  track: string | null;
  direction: string | null;
  direction_en: string | null;
  seniority: string | null;
  seniority_en: string | null;
  tags: string[] | null;
  /** English tags（JSON 字符串数组文本，与 tags 同构；空则前台英文模式回落中文标签） */
  tags_en: string | null;
  urgent: boolean;
  urgent_started_at: string | null;
  urgent_expires_at: string | null;
  featured: boolean;
  published_at: string | null;
}

// Input types for Public API and analytics
export interface LeadInput {
  full_name: string;
  phone?: string;
  email?: string;
  wechat?: string;
  site_id: string;
  publication_id: string;
  source_channel?: string;
  source_detail?: string;
  resume_url?: string;
  status: string;
}

export interface AnalyticsEventInput {
  site_id?: string;
  publication_id?: string;
  lead_id?: string;
  event_type: string;
  source_channel?: string;
  session_id?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}
