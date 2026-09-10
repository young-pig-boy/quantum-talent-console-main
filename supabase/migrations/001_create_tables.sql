-- ============================================================================
-- WARNING:
-- Schema drift exists. Do not execute against production without audit.
-- The real database differs from this migration (varchar ids vs UUID, no FKs,
-- no RLS, no policies, no indexes/triggers, extra columns). See
-- docs/DATABASE_REALITY.md for the audited reality.
-- ============================================================================
-- ============================================================================
-- Quantum Talent Console — Database Migration 001
-- ============================================================================
-- This migration creates the complete schema for the recruitment console.
-- It is designed to be idempotent: uses IF NOT EXISTS and safe operations.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- HELPER: updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'operator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    industry TEXT NOT NULL DEFAULT '',
    track TEXT NOT NULL DEFAULT '',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    jd TEXT,
    salary_internal TEXT,
    hard_requirements TEXT,
    exclusion_rules TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'recruiting', 'paused', 'closed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- job_publications
CREATE TABLE IF NOT EXISTS job_publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    company_display_name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    salary_display TEXT,
    summary TEXT,
    responsibilities TEXT,
    requirements TEXT,
    education_requirement TEXT,
    experience_requirement TEXT,
    track TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'offline', 'archived')),
    published_at TIMESTAMPTZ,
    offline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_publications_slug UNIQUE (slug)
);

-- leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    wechat TEXT,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    publication_id UUID REFERENCES job_publications(id) ON DELETE SET NULL,
    source_channel TEXT,
    source_detail TEXT,
    resume_url TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacting', 'qualified', 'converted', 'invalid')),
    invalid_reason TEXT,
    notes TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    converted_talent_id UUID,
    reviewed_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- talents
CREATE TABLE IF NOT EXISTS talents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    wechat TEXT,
    current_company TEXT,
    current_title TEXT,
    city TEXT,
    education_summary TEXT,
    experience_years INTEGER,
    resume_url TEXT,
    source_channel TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for leads.converted_talent_id (after talents table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_converted_talent'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_talent
            FOREIGN KEY (converted_talent_id) REFERENCES talents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id UUID NOT NULL REFERENCES talents(id) ON DELETE RESTRICT,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    stage TEXT NOT NULL DEFAULT 'matching' CHECK (stage IN (
        'matching', 'contacting', 'interested', 'recommended',
        'client_review', 'interview', 'offer', 'hired',
        'rejected', 'withdrawn'
    )),
    client_feedback TEXT,
    interview_notes TEXT,
    offer_summary TEXT,
    rejection_reason TEXT,
    withdrawal_reason TEXT,
    recommended_at TIMESTAMPTZ,
    offer_at TIMESTAMPTZ,
    hired_at TIMESTAMPTZ,
    next_action_at TIMESTAMPTZ,
    last_stage_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_applications_talent_job UNIQUE (talent_id, job_id)
);

-- stage_events
CREATE TABLE IF NOT EXISTS stage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'stage_change',
    note TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    publication_id UUID REFERENCES job_publications(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'job_impression', 'job_view', 'share',
        'contact_click', 'apply_start', 'apply_submit'
    )),
    source_channel TEXT,
    session_id TEXT,
    referrer TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
