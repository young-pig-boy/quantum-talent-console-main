-- ============================================================================
-- WARNING:
-- Schema drift exists. Do not execute against production without audit.
-- The real database has no secondary indexes and no updated_at triggers.
-- See docs/DATABASE_REALITY.md for the audited reality.
-- ============================================================================
-- ============================================================================
-- Migration 002: Indexes & Triggers
-- ============================================================================

-- ============================================================================
-- TRIGGERS — updated_at
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'profiles', 'sites', 'companies', 'jobs',
            'job_publications', 'leads', 'talents', 'applications'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || tbl || '_updated_at'
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_owner_id ON jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- job_publications
CREATE INDEX IF NOT EXISTS idx_job_publications_job_id ON job_publications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_publications_site_id ON job_publications(site_id);
CREATE INDEX IF NOT EXISTS idx_job_publications_status ON job_publications(status);
CREATE INDEX IF NOT EXISTS idx_job_publications_slug ON job_publications(slug);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_publication_id ON leads(publication_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);

-- talents
CREATE INDEX IF NOT EXISTS idx_talents_owner_id ON talents(owner_id);
CREATE INDEX IF NOT EXISTS idx_talents_email ON talents(email);
CREATE INDEX IF NOT EXISTS idx_talents_phone ON talents(phone);

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_talent_id ON applications(talent_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(stage);
CREATE INDEX IF NOT EXISTS idx_applications_owner_id ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_applications_next_action_at ON applications(next_action_at);

-- stage_events
CREATE INDEX IF NOT EXISTS idx_stage_events_application_id ON stage_events(application_id);

-- analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_publication_id ON analytics_events(publication_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON analytics_events(occurred_at);
