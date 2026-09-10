import { z } from 'zod';
import { QUANTUM_TRACK_VALUES } from '@/lib/domain/quantum-tracks';

// ---- Company ----
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  display_name: z.string().min(1, 'Display name is required'),
  industry: z.string().optional().default(''),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ---- Job ----
const intakeMetadataSchema = z.object({
  source_id: z.string().optional(),
  priority: z.string().optional(),
  publish_wave: z.number().int().positive().optional().nullable(),
  duplicate_group: z.string().optional(),
  source_file: z.string().optional(),
  publication_status: z.string().optional(),
}).optional().nullable();

export const createJobSchema = z.object({
  company_id: z.string().uuid(),
  owner_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Job title is required'),
  city: z.string().optional().default(''),
  jd: z.string().optional().nullable(),
  salary_internal: z.string().optional().nullable(),
  hard_requirements: z.string().optional().nullable(),
  exclusion_rules: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  intake_metadata: intakeMetadataSchema,
  status: z.enum(['draft', 'recruiting', 'paused', 'closed', 'archived']).optional().default('draft'),
});

export const updateJobSchema = createJobSchema.partial();

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// ---- JobPublication ----
export const createPublicationSchema = z.object({
  job_id: z.string().uuid(),
  site_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  company_display_name: z.string().optional(),
  city: z.string().optional().default(''),
  salary_display: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  education_requirement: z.string().optional().nullable(),
  experience_requirement: z.string().optional().nullable(),
  track: z.enum(QUANTUM_TRACK_VALUES).optional().nullable(),
  direction: z.string().optional().nullable(),
  seniority: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  urgent: z.boolean().optional().default(false),
  urgent_started_at: z.string().datetime({ offset: true }).optional().nullable(),
  urgent_expires_at: z.string().datetime({ offset: true }).optional().nullable(),
  featured: z.boolean().optional().default(false),
  slug: z.string().min(1, 'Slug is required'),
});

export const updatePublicationSchema = createPublicationSchema.partial().superRefine((data, ctx) => {
  if (
    data.urgent_started_at &&
    data.urgent_expires_at &&
    new Date(data.urgent_expires_at).getTime() <= new Date(data.urgent_started_at).getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '急招截止时间必须晚于开始时间',
      path: ['urgent_expires_at'],
    });
  }
});

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;

// ---- Lead ----
export const createLeadSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  wechat: z.string().optional().nullable(),
  site_id: z.string().uuid(),
  publication_id: z.string().uuid(),
  source_channel: z.string().optional().nullable(),
  source_detail: z.string().optional().nullable(),
  resume_url: z.string().url().optional().nullable(),
}).refine(
  (data) => data.phone || data.email,
  { message: 'At least phone or email is required' }
);

export const updateLeadSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  wechat: z.string().optional().nullable(),
  site_id: z.string().uuid().optional(),
  publication_id: z.string().uuid().optional(),
  source_channel: z.string().optional().nullable(),
  source_detail: z.string().optional().nullable(),
  resume_url: z.string().url().optional().nullable(),
  status: z.enum(['new', 'reviewed', 'contacting', 'qualified', 'converted', 'invalid']).optional(),
  invalid_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ---- Talent ----
export const createTalentSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  wechat: z.string().optional().nullable(),
  current_company: z.string().optional().nullable(),
  current_title: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  education_summary: z.string().optional().nullable(),
  experience_years: z.number().optional().nullable(),
  resume_url: z.string().url().optional().nullable(),
  source_channel: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
});

export const updateTalentSchema = createTalentSchema.partial();

export type CreateTalentInput = z.infer<typeof createTalentSchema>;
export type UpdateTalentInput = z.infer<typeof updateTalentSchema>;

// ---- Application ----
export const createApplicationSchema = z.object({
  talent_id: z.string().uuid(),
  job_id: z.string().uuid(),
  owner_id: z.string().uuid().optional().nullable(),
  stage: z.enum([
    'matching', 'contacting', 'interested', 'recommended',
    'client_review', 'interview', 'offer', 'hired',
    'rejected', 'withdrawn',
  ]).optional().default('matching'),
});

/**
 * Application PATCH schema — only allows non-stage metadata fields.
 *
 * Application.stage MUST be modified exclusively through the transition API:
 *   POST /api/applications/[id]/transition
 *
 * The following fields are explicitly rejected:
 *   stage, talent_id, job_id, owner_id, recommended_at,
 *   offer_at, hired_at, last_stage_changed_at, created_at, updated_at
 */
export const updateApplicationSchema = z.object({
  next_action_at: z.string().datetime().optional().nullable(),
});

export const transitionApplicationSchema = z.object({
  to_stage: z.enum([
    'matching', 'contacting', 'interested', 'recommended',
    'client_review', 'interview', 'offer', 'hired',
    'rejected', 'withdrawn',
  ]),
  note: z.string().optional().nullable(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type TransitionApplicationInput = z.infer<typeof transitionApplicationSchema>;

// ---- Public Apply ----
export const publicApplySchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  wechat: z.string().optional().nullable(),
  publication_id: z.string().uuid(),
  resume_url: z.string().url().optional().nullable(),
  source_channel: z.string().optional().default('官网'),
  source_detail: z.string().optional().nullable(),
}).refine(
  (data) => data.phone || data.email,
  { message: 'At least phone or email is required' }
);

export type PublicApplyInput = z.infer<typeof publicApplySchema>;

// ---- Public Analytics Event ----
export const analyticsEventSchema = z.object({
  site_id: z.string().uuid().optional().nullable(),
  publication_id: z.string().uuid().optional().nullable(),
  event_type: z.enum([
    'job_impression', 'job_view', 'share',
    'contact_click', 'apply_start', 'apply_submit',
  ]),
  source_channel: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

// ---- Lead status transitions ----
export const markLeadReviewedSchema = z.object({
  owner_id: z.string().uuid().optional().nullable(),
});

export const markLeadInvalidSchema = z.object({
  invalid_reason: z.string().min(1, 'Invalid reason is required'),
});

export const markLeadQualifiedSchema = z.object({
  notes: z.string().optional().nullable(),
});
