-- ============================================================================
-- WARNING:
-- This migration file documents the REAL database state as of 2026-08-06
-- (verified against Live Supabase wbpnvbvdotkjhwxhndhz).
-- Do NOT execute blindly — these functions already exist on the Live DB.
-- This file is kept in sync for documentation and disaster recovery only.
-- ============================================================================
-- ============================================================================
-- Migration 004: Database Functions (RPC)
-- ============================================================================

-- ============================================================================
-- convert_lead_to_talent
-- Converts a lead into a talent, checking for duplicates.
-- Returns the talent id (existing or new).
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_lead_to_talent(
    p_lead_id UUID,
    p_owner_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_lead leads%ROWTYPE;
    v_existing_talent_id UUID;
    v_new_talent_id UUID;
BEGIN
    -- Read lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    IF v_lead.status NOT IN ('qualified', 'reviewed', 'contacting') THEN
        RAISE EXCEPTION 'Lead status must be reviewed/contacting/qualified to convert';
    END IF;

    -- Check duplicate: phone
    IF v_lead.phone IS NOT NULL THEN
        SELECT id INTO v_existing_talent_id
        FROM talents
        WHERE phone = v_lead.phone
        LIMIT 1;
    END IF;

    -- Check duplicate: email
    IF v_existing_talent_id IS NULL AND v_lead.email IS NOT NULL THEN
        SELECT id INTO v_existing_talent_id
        FROM talents
        WHERE email = v_lead.email
        LIMIT 1;
    END IF;

    -- If duplicate found, link and return
    IF v_existing_talent_id IS NOT NULL THEN
        UPDATE leads
        SET status = 'converted',
            converted_talent_id = v_existing_talent_id,
            converted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_lead_id;
        RETURN v_existing_talent_id;
    END IF;

    -- Create new talent
    INSERT INTO talents (
        full_name, phone, email, wechat,
        current_company, current_title, city,
        resume_url, source_channel, owner_id
    ) VALUES (
        v_lead.full_name, v_lead.phone, v_lead.email, v_lead.wechat,
        NULL, NULL, NULL,
        v_lead.resume_url, v_lead.source_channel, COALESCE(p_owner_id, v_lead.owner_id)
    )
    RETURNING id INTO v_new_talent_id;

    -- Update lead
    UPDATE leads
    SET status = 'converted',
        converted_talent_id = v_new_talent_id,
        converted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_lead_id;

    RETURN v_new_talent_id;
END;
$$;

-- ============================================================================
-- transition_application_stage
-- Safely transitions an application to a new stage.
-- Actor (p_actor_id) and note are passed to the AFTER UPDATE trigger via
-- transaction-local set_config; stage_events is written ONLY by the DB
-- trigger (single source of truth). No direct stage_events INSERT here.
--
-- Live DB: RETURNS jsonb (the updated application row as JSON).
-- ============================================================================
CREATE OR REPLACE FUNCTION transition_application_stage(
    p_application_id UUID,
    p_to_stage TEXT,
    p_actor_id UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Validate stage is valid enum value
    IF p_to_stage NOT IN (
        'matching', 'contacting', 'interested', 'recommended',
        'client_review', 'interview', 'offer', 'hired',
        'rejected', 'withdrawn'
    ) THEN
        RAISE EXCEPTION 'Invalid stage: %', p_to_stage;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM applications WHERE id = p_application_id) THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    -- State machine validation is done in application layer.
    -- Here we only do the DB-level update. Context is passed via
    -- transaction-local settings consumed by the AFTER UPDATE trigger.
    PERFORM set_config('app.stage_event_actor', COALESCE(p_actor_id::text, ''), true);
    PERFORM set_config('app.stage_event_note', COALESCE(p_note, ''), true);

    UPDATE applications
    SET stage = p_to_stage
    WHERE id = p_application_id
    RETURNING row_to_json(applications.*)::jsonb INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- close_job
-- Closes a job and forces all published publications offline.
-- ============================================================================
CREATE OR REPLACE FUNCTION close_job(
    p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job jobs%ROWTYPE;
BEGIN
    SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found';
    END IF;

    IF v_job.status NOT IN ('recruiting', 'paused') THEN
        RAISE EXCEPTION 'Job cannot be closed from status: %', v_job.status;
    END IF;

    -- Update job status
    UPDATE jobs SET status = 'closed', updated_at = NOW() WHERE id = p_job_id;

    -- Force offline all published publications
    UPDATE job_publications
    SET status = 'offline', offline_at = NOW(), updated_at = NOW()
    WHERE job_id = p_job_id AND status = 'published';
END;
$$;

-- ============================================================================
-- archive_job
-- Archives a job and forces all publications archived.
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_job(
    p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job jobs%ROWTYPE;
BEGIN
    SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found';
    END IF;

    IF v_job.status != 'closed' THEN
        RAISE EXCEPTION 'Job must be closed before archiving. Current: %', v_job.status;
    END IF;

    -- Update job status
    UPDATE jobs SET status = 'archived', updated_at = NOW() WHERE id = p_job_id;

    -- Archive all publications
    UPDATE job_publications
    SET status = 'archived', updated_at = NOW()
    WHERE job_id = p_job_id;
END;
$$;

-- ============================================================================
-- create_application_with_context
-- Creates an application and returns the inserted row as jsonb.
-- Actor (p_actor_id) is passed to the AFTER INSERT trigger via
-- transaction-local set_config; stage_events (application_created) is
-- written ONLY by the DB trigger.
--
-- Live DB: RETURNS jsonb (the created application row as JSON).
-- ============================================================================
CREATE OR REPLACE FUNCTION create_application_with_context(
    p_talent_id UUID,
    p_job_id UUID,
    p_owner_id UUID DEFAULT NULL,
    p_stage TEXT DEFAULT 'matching',
    p_actor_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_stage NOT IN (
        'matching', 'contacting', 'interested', 'recommended',
        'client_review', 'interview', 'offer', 'hired',
        'rejected', 'withdrawn'
    ) THEN
        RAISE EXCEPTION 'Invalid stage: %', p_stage;
    END IF;

    PERFORM set_config('app.stage_event_actor', COALESCE(p_actor_id::text, ''), true);
    PERFORM set_config('app.stage_event_note', '', true);

    INSERT INTO applications (talent_id, job_id, owner_id, stage)
    VALUES (p_talent_id, p_job_id, p_owner_id, p_stage)
    RETURNING row_to_json(applications.*)::jsonb INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- set_application_stage_changed_at (BEFORE UPDATE)
-- Maintains stage-related timestamps when stage changes.
-- Only handles stage time columns; updated_at is maintained by
-- trg_*_updated_at (see migration 002).
-- ============================================================================
CREATE OR REPLACE FUNCTION set_application_stage_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.last_stage_changed_at := NOW();
        IF NEW.stage = 'recommended' AND OLD.stage <> 'recommended' THEN
            NEW.recommended_at := NOW();
        END IF;
        IF NEW.stage = 'offer' AND OLD.stage <> 'offer' THEN
            NEW.offer_at := NOW();
        END IF;
        IF NEW.stage = 'hired' AND OLD.stage <> 'hired' THEN
            NEW.hired_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- record_application_stage_event (AFTER INSERT / UPDATE)
-- Single source of truth for stage_events:
--   INSERT → application_created (from_stage = NULL, to_stage = NEW.stage)
--   UPDATE (stage changed) → stage_change (from_stage = OLD.stage, to_stage = NEW.stage)
-- created_by / note come from transaction-local settings set by the RPC
-- functions (create_application_with_context / transition_application_stage).
--
-- Live DB GUC names: app.stage_event_actor / app.stage_event_note
-- ============================================================================
CREATE OR REPLACE FUNCTION record_application_stage_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor UUID;
    v_note TEXT;
BEGIN
    v_actor := NULLIF(current_setting('app.stage_event_actor', true), '')::UUID;
    v_note := NULLIF(current_setting('app.stage_event_note', true), '');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO stage_events (
            application_id, from_stage, to_stage,
            event_type, note, created_by
        ) VALUES (
            NEW.id, NULL, NEW.stage,
            'application_created', v_note, v_actor
        );
    ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
        INSERT INTO stage_events (
            application_id, from_stage, to_stage,
            event_type, note, created_by
        ) VALUES (
            NEW.id, OLD.stage, NEW.stage,
            'stage_change', v_note, v_actor
        );
    END IF;

    RETURN NULL;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS application_stage_changed_at_trigger ON applications;
CREATE TRIGGER application_stage_changed_at_trigger
    BEFORE UPDATE OF stage ON applications
    FOR EACH ROW EXECUTE FUNCTION set_application_stage_changed_at();

DROP TRIGGER IF EXISTS application_stage_event_trigger ON applications;
CREATE TRIGGER application_stage_event_trigger
    AFTER INSERT OR UPDATE OF stage ON applications
    FOR EACH ROW EXECUTE FUNCTION record_application_stage_event();
