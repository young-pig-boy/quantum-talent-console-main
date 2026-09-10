-- ============================================================================
-- WARNING:
-- Schema drift exists. Do not execute against production without audit.
-- The real database has RLS DISABLED on all tables and zero policies.
-- Enabling RLS without policies would lock out anon/authenticated roles.
-- See docs/DATABASE_REALITY.md for the audited reality.
-- ============================================================================
-- ============================================================================
-- Migration 003: Row-Level Security (RLS)
-- ============================================================================

-- ============================================================================
-- HELPER: Enable RLS on all tables
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'profiles', 'sites', 'companies', 'jobs',
            'job_publications', 'leads', 'talents', 'applications',
            'stage_events', 'analytics_events'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- PROFILES
-- ============================================================================

-- All authenticated users can read profiles
CREATE POLICY "Authenticated users can read profiles"
ON profiles FOR SELECT TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin can manage all profiles
CREATE POLICY "Admin can manage all profiles"
ON profiles FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- ============================================================================
-- SITES
-- ============================================================================

-- Authenticated users can read sites
CREATE POLICY "Authenticated users can read sites"
ON sites FOR SELECT TO authenticated
USING (true);

-- Admin can manage sites
CREATE POLICY "Admin can manage sites"
ON sites FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Public (anonymous) can read active sites
CREATE POLICY "Public can read active sites"
ON sites FOR SELECT TO anon
USING (status = 'active');

-- ============================================================================
-- COMPANIES
-- ============================================================================

CREATE POLICY "Authenticated users can read companies"
ON companies FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin and operator can manage companies"
ON companies FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'operator')
    )
);

-- ============================================================================
-- JOBS
-- ============================================================================

CREATE POLICY "Authenticated users can read jobs"
ON jobs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Owner and admin can manage jobs"
ON jobs FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- ============================================================================
-- JOB_PUBLICATIONS
-- ============================================================================

CREATE POLICY "Authenticated users can read publications"
ON job_publications FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin and operator can manage publications"
ON job_publications FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'operator')
    )
);

-- Anonymous can read published publications only
CREATE POLICY "Public can read published publications"
ON job_publications FOR SELECT TO anon
USING (status = 'published');

-- ============================================================================
-- LEADS
-- ============================================================================

CREATE POLICY "Authenticated users can read leads"
ON leads FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Owner and admin can manage leads"
ON leads FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR owner_id IS NULL
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'operator')
    )
);

-- Anonymous cannot read leads (handled by Public API)

-- ============================================================================
-- TALENTS
-- ============================================================================

CREATE POLICY "Authenticated users can read talents"
ON talents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Owner and admin can manage talents"
ON talents FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR owner_id IS NULL
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'operator')
    )
);

-- ============================================================================
-- APPLICATIONS
-- ============================================================================

CREATE POLICY "Authenticated users can read applications"
ON applications FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Owner and admin can manage applications"
ON applications FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'operator')
    )
);

-- ============================================================================
-- STAGE_EVENTS
-- ============================================================================

CREATE POLICY "Authenticated users can read stage_events"
ON stage_events FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin can manage stage_events"
ON stage_events FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- ============================================================================
-- ANALYTICS_EVENTS
-- ============================================================================

CREATE POLICY "Authenticated users can read analytics_events"
ON analytics_events FOR SELECT TO authenticated
USING (true);

-- Anonymous can insert analytics events (write only, no read)
CREATE POLICY "Public can insert analytics events"
ON analytics_events FOR INSERT TO anon
WITH CHECK (true);

-- Authenticated can insert analytics events
CREATE POLICY "Authenticated can insert analytics events"
ON analytics_events FOR INSERT TO authenticated
WITH CHECK (true);
