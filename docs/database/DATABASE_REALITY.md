# DATABASE_REALITY.md — 当前 Supabase 真实 Schema

**Project Ref**: `wbpnvbvdotkjhwxhndhz`
**Snapshot Date**: 2025-07-16
**方式**: 通过 `information_schema.columns` 直接查询生产数据库

> 本文档是**事实基准**。所有代码中的 TypeScript 类型、Zod Schema、Repository 写入字段必须与此一致。
> 本文档不包含推测、不包含旧 migration 中的历史字段。

## Tables

### companies

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| name | varchar(256) | NO | - | |
| display_name | varchar(256) | NO | - | |
| industry | varchar(128) | YES | - | |
| track | varchar(128) | YES | - | |
| description | text | YES | - | |
| website | varchar(512) | YES | - | |
| contact | varchar(128) | YES | - | |
| phone | varchar(64) | YES | - | |
| status | varchar(32) | NO | 'active' | allowed: active, inactive |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id)

### jobs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| company_id | varchar(36) | NO | - | FK → companies |
| owner_id | varchar(36) | NO | - | FK → auth.users |
| title | varchar(256) | NO | - | |
| city | varchar(128) | YES | - | |
| jd | text | YES | - | Job Description |
| salary_internal | text | YES | - | Internal salary info |
| hard_requirements | text | YES | - | |
| exclusion_rules | text | YES | - | |
| internal_notes | text | YES | - | |
| track | varchar(128) | YES | - | |
| status | varchar(32) | NO | 'draft' | allowed: draft, recruiting, paused, closed, archived |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id)
**注**: 字段名为 `jd` 和 `salary_internal`，不是 `original_jd` 或 `internal_salary`。

### job_publications

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| job_id | varchar(36) | NO | - | FK → jobs |
| site_id | varchar(36) | NO | - | FK → sites |
| title | varchar(256) | NO | - | |
| company_display_name | varchar(256) | NO | - | |
| city | varchar(128) | YES | - | |
| salary_display | text | YES | - | |
| summary | text | YES | - | |
| responsibilities | text | YES | - | |
| requirements | text | YES | - | |
| education_requirement | text | YES | - | |
| experience_requirement | text | YES | - | |
| track | varchar(128) | YES | - | |
| tags | jsonb | YES | - | |
| slug | varchar(512) | NO | - | |
| status | varchar(32) | NO | 'draft' | allowed: draft, published, offline, archived |
| published_at | timestamptz | YES | - | |
| offline_at | timestamptz | YES | - | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id)
**注**: `title`, `company_display_name`, `summary`, `tags`, `education_requirement`, `experience_requirement` 均在表中存在。

### leads

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| full_name | varchar(128) | NO | - | |
| phone | varchar(64) | YES | - | |
| email | varchar(256) | YES | - | |
| wechat | varchar(128) | YES | - | |
| site_id | varchar(36) | **NO** | - | FK → sites |
| publication_id | varchar(36) | **NO** | - | FK → job_publications |
| source_channel | varchar(128) | YES | - | |
| source_detail | text | YES | - | |
| resume_url | text | YES | - | |
| status | varchar(32) | NO | 'new' | allowed: new, reviewed, contacting, qualified, converted, invalid |
| invalid_reason | text | YES | - | |
| notes | text | YES | - | |
| owner_id | varchar(36) | YES | - | |
| converted_talent_id | varchar(36) | YES | - | |
| reviewed_at | timestamptz | YES | - | |
| converted_at | timestamptz | YES | - | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id)
**注**: `site_id` 和 `publication_id` 是 **NOT NULL**。**不存在** `job_id` 列。

### talents

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| full_name | varchar(128) | NO | - | |
| phone | varchar(64) | YES | - | |
| email | varchar(256) | YES | - | |
| wechat | varchar(128) | YES | - | |
| current_company | varchar(256) | YES | - | |
| current_title | varchar(256) | YES | - | |
| city | varchar(128) | YES | - | |
| education_summary | text | YES | - | |
| experience_years | integer | YES | - | |
| resume_url | text | YES | - | |
| source_channel | varchar(128) | YES | - | |
| tags | jsonb | YES | - | |
| notes | text | YES | - | |
| owner_id | varchar(36) | YES | - | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id)
**注**: **不存在** `headline`, `experience_summary`, `status` 列。

### applications

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| talent_id | varchar(36) | NO | - | FK → talents |
| job_id | varchar(36) | NO | - | FK → jobs |
| owner_id | varchar(36) | YES | - | |
| stage | varchar(32) | NO | 'matching' | allowed: matching, contacting, interested, recommended, client_review, interview, offer, hired, rejected, withdrawn |
| client_feedback | text | YES | - | |
| interview_notes | text | YES | - | |
| offer_summary | text | YES | - | |
| rejection_reason | text | YES | - | |
| withdrawal_reason | text | YES | - | |
| recommended_at | timestamptz | YES | - | |
| offer_at | timestamptz | YES | - | |
| hired_at | timestamptz | YES | - | |
| next_action_at | timestamptz | YES | - | |
| last_stage_changed_at | timestamptz | YES | - | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**Constraints**: PK(id), UNIQUE(talent_id, job_id)

### stage_events

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | varchar(36) | NO | gen_random_uuid() | PK |
| application_id | varchar(36) | NO | - | FK → applications |
| from_stage | varchar(32) | YES | - | |
| to_stage | varchar(32) | NO | - | |
| event_type | varchar(64) | NO | - | |
| note | text | YES | - | |
| created_by | varchar(36) | YES | - | |
| created_at | timestamptz | NO | now() | |

**Constraints**: PK(id)

## Triggers

**当前数据库中没有任何用户自定义 Trigger。** 所有表均无 `record_application_stage_event()` 或类似触发器。

Application 的 StageEvent 记录完全由应用层代码（`ApplicationService`）手动写入，这是正确的行为。

## CHECK Constraints

**当前六个业务表（companies, jobs, job_publications, leads, talents, applications）均无 CHECK constraint。**

这意味着所有 status/stage 值的校验完全依赖应用层（TypeScript union + Zod schema）。

## RLS / RPC

本文档不涉及 RLS Policy 和 RPC Function 的详细内容（本轮不改动）。
