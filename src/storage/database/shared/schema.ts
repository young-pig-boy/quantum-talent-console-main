import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";

// ============================================================
// 系统表（保留）
// ============================================================
export const healthCheck = pgTable("health_check", {
  id: integer().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// ============================================================
// profiles — 对应 Supabase auth.users
// ============================================================
export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    display_name: varchar("display_name", { length: 128 }).notNull(),
    role: varchar("role", { length: 32 }).notNull().default("consultant"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("profiles_role_idx").on(table.role),
    index("profiles_status_idx").on(table.status),
  ]
);

// ============================================================
// sites — 人才网站
// ============================================================
export const sites = pgTable(
  "sites",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 256 }).notNull(),
    domain: varchar("domain", { length: 512 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sites_status_idx").on(table.status),
  ]
);

// ============================================================
// companies — 公司
// ============================================================
export const companies = pgTable(
  "companies",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 256 }).notNull(),
    display_name: varchar("display_name", { length: 256 }).notNull(),
    industry: varchar("industry", { length: 128 }),
    track: varchar("track", { length: 128 }),
    description: text("description"),
    website: varchar("website", { length: 512 }),
    contact: varchar("contact", { length: 128 }),
    phone: varchar("phone", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("companies_status_idx").on(table.status),
    index("companies_track_idx").on(table.track),
    index("companies_name_idx").on(table.name),
  ]
);

// ============================================================
// jobs — 内部招聘岗位
// ============================================================
export const jobs = pgTable(
  "jobs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    company_id: varchar("company_id", { length: 36 }).notNull().references(() => companies.id),
    owner_id: varchar("owner_id", { length: 36 }).notNull().references(() => profiles.id),
    title: varchar("title", { length: 256 }).notNull(),
    city: varchar("city", { length: 128 }),
    jd: text("jd"),
    salary_internal: text("salary_internal"),
    hard_requirements: text("hard_requirements"),
    exclusion_rules: text("exclusion_rules"),
    internal_notes: text("internal_notes"),
    track: varchar("track", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("jobs_company_id_idx").on(table.company_id),
    index("jobs_owner_id_idx").on(table.owner_id),
    index("jobs_status_idx").on(table.status),
    index("jobs_city_idx").on(table.city),
  ]
);

// ============================================================
// job_publications — 公开岗位
// ============================================================
export const jobPublications = pgTable(
  "job_publications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    job_id: varchar("job_id", { length: 36 }).notNull().references(() => jobs.id),
    site_id: varchar("site_id", { length: 36 }).references(() => sites.id),
    title: varchar("title", { length: 256 }).notNull(),
    company_display_name: varchar("company_display_name", { length: 256 }).notNull(),
    city: varchar("city", { length: 128 }),
    salary_display: text("salary_display"),
    summary: text("summary"),
    responsibilities: text("responsibilities"),
    requirements: text("requirements"),
    education_requirement: text("education_requirement"),
    experience_requirement: text("experience_requirement"),
    track: varchar("track", { length: 128 }),
    tags: jsonb("tags"),
    slug: varchar("slug", { length: 512 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    published_at: timestamp("published_at", { withTimezone: true }),
    offline_at: timestamp("offline_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pub_job_id_idx").on(table.job_id),
    index("pub_site_id_idx").on(table.site_id),
    index("pub_status_idx").on(table.status),
    index("pub_track_idx").on(table.track),
    index("pub_city_idx").on(table.city),
    uniqueIndex("pub_slug_unique").on(table.slug),
  ]
);

// ============================================================
// leads — 在线投递
// ============================================================
export const leads = pgTable(
  "leads",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    full_name: varchar("full_name", { length: 128 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    email: varchar("email", { length: 256 }),
    wechat: varchar("wechat", { length: 128 }),
    site_id: varchar("site_id", { length: 36 }).references(() => sites.id),
    publication_id: varchar("publication_id", { length: 36 }).notNull().references(() => jobPublications.id),
    source_channel: varchar("source_channel", { length: 128 }),
    source_detail: text("source_detail"),
    resume_url: text("resume_url"),
    status: varchar("status", { length: 32 }).notNull().default("new"),
    invalid_reason: text("invalid_reason"),
    notes: text("notes"),
    owner_id: varchar("owner_id", { length: 36 }).references(() => profiles.id),
    converted_talent_id: varchar("converted_talent_id", { length: 36 }),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    converted_at: timestamp("converted_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("leads_publication_id_idx").on(table.publication_id),
    index("leads_status_idx").on(table.status),
    index("leads_owner_id_idx").on(table.owner_id),
    index("leads_email_idx").on(table.email),
    index("leads_phone_idx").on(table.phone),
    index("leads_source_channel_idx").on(table.source_channel),
  ]
);

// ============================================================
// talents — 人才库
// ============================================================
export const talents = pgTable(
  "talents",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    full_name: varchar("full_name", { length: 128 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    email: varchar("email", { length: 256 }),
    wechat: varchar("wechat", { length: 128 }),
    current_company: varchar("current_company", { length: 256 }),
    current_title: varchar("current_title", { length: 256 }),
    city: varchar("city", { length: 128 }),
    education_summary: text("education_summary"),
    experience_years: integer("experience_years"),
    resume_url: text("resume_url"),
    source_channel: varchar("source_channel", { length: 128 }),
    tags: jsonb("tags"),
    notes: text("notes"),
    owner_id: varchar("owner_id", { length: 36 }).references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("talents_owner_id_idx").on(table.owner_id),
    index("talents_email_idx").on(table.email),
    index("talents_phone_idx").on(table.phone),
    index("talents_city_idx").on(table.city),
    index("talents_current_company_idx").on(table.current_company),
    index("talents_source_channel_idx").on(table.source_channel),
  ]
);

// ============================================================
// applications — Talent × Job
// ============================================================
export const applications = pgTable(
  "applications",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    talent_id: varchar("talent_id", { length: 36 }).notNull().references(() => talents.id),
    job_id: varchar("job_id", { length: 36 }).notNull().references(() => jobs.id),
    owner_id: varchar("owner_id", { length: 36 }).references(() => profiles.id),
    stage: varchar("stage", { length: 32 }).notNull().default("matching"),
    client_feedback: text("client_feedback"),
    interview_notes: text("interview_notes"),
    offer_summary: text("offer_summary"),
    rejection_reason: text("rejection_reason"),
    withdrawal_reason: text("withdrawal_reason"),
    recommended_at: timestamp("recommended_at", { withTimezone: true }),
    offer_at: timestamp("offer_at", { withTimezone: true }),
    hired_at: timestamp("hired_at", { withTimezone: true }),
    next_action_at: timestamp("next_action_at", { withTimezone: true }),
    last_stage_changed_at: timestamp("last_stage_changed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("app_talent_id_idx").on(table.talent_id),
    index("app_job_id_idx").on(table.job_id),
    index("app_owner_id_idx").on(table.owner_id),
    index("app_stage_idx").on(table.stage),
    index("app_next_action_at_idx").on(table.next_action_at),
    unique("app_talent_job_unique").on(table.talent_id, table.job_id),
  ]
);

// ============================================================
// stage_events — 招聘推进历史
// ============================================================
export const stageEvents = pgTable(
  "stage_events",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    application_id: varchar("application_id", { length: 36 }).notNull().references(() => applications.id),
    from_stage: varchar("from_stage", { length: 32 }),
    to_stage: varchar("to_stage", { length: 32 }).notNull(),
    event_type: varchar("event_type", { length: 64 }).notNull(),
    note: text("note"),
    created_by: varchar("created_by", { length: 36 }).references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("se_application_id_idx").on(table.application_id),
    index("se_created_at_idx").on(table.created_at),
  ]
);

// ============================================================
// analytics_events — 分析事件
// ============================================================
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    site_id: varchar("site_id", { length: 36 }).references(() => sites.id),
    publication_id: varchar("publication_id", { length: 36 }).references(() => jobPublications.id),
    lead_id: varchar("lead_id", { length: 36 }),
    event_type: varchar("event_type", { length: 64 }).notNull(),
    source_channel: varchar("source_channel", { length: 128 }),
    session_id: varchar("session_id", { length: 128 }),
    referrer: text("referrer"),
    metadata: jsonb("metadata"),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ae_publication_id_idx").on(table.publication_id),
    index("ae_event_type_idx").on(table.event_type),
    index("ae_occurred_at_idx").on(table.occurred_at),
    index("ae_publication_event_idx").on(table.publication_id, table.event_type),
  ]
);
