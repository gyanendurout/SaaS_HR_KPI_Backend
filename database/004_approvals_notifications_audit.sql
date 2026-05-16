-- =============================================================================
-- JOOLA Track — Phase 2 Schema: Approvals, Notifications, Audit
-- File: 004_approvals_notifications_audit.sql
-- =============================================================================

-- =============================================================================
-- ALTER: add extra columns to existing tables
-- =============================================================================

-- regions: flag emoji, description, brand color
ALTER TABLE regions ADD COLUMN IF NOT EXISTS flag        VARCHAR(10);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE regions ADD COLUMN IF NOT EXISTS color       VARCHAR(20);

-- users: granular system role, optional avatar color
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sys_role') THEN
    CREATE TYPE sys_role AS ENUM ('admin', 'global', 'regional', 'manager', 'individual');
  END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sys_role sys_role NOT NULL DEFAULT 'individual';
ALTER TABLE users ADD COLUMN IF NOT EXISTS color    VARCHAR(20);

-- kpis: approval workflow status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
  END IF;
END $$;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS idx_kpis_approval_status ON kpis (approval_status);


-- =============================================================================
-- TABLE: approvals
-- =============================================================================

CREATE TABLE IF NOT EXISTS approvals (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id        UUID NOT NULL REFERENCES kpis  (id) ON DELETE CASCADE,
    requested_by  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reviewed_by   UUID          REFERENCES users (id) ON DELETE SET NULL,
    status        approval_status NOT NULL DEFAULT 'pending',
    note          TEXT,                              -- requester note
    reviewer_note TEXT,                              -- approver/rejector comment
    requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_kpi_id       ON approvals (kpi_id);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_by ON approvals (requested_by);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewed_by  ON approvals (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_approvals_status       ON approvals (status);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_approvals" ON approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_approvals_updated_at
    BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: notifications
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_type') THEN
    CREATE TYPE notif_type AS ENUM (
      'approval_requested', 'approval_approved', 'approval_rejected',
      'kpi_assigned', 'kpi_update_due', 'kpi_completed', 'system'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        notif_type NOT NULL DEFAULT 'system',
    title       VARCHAR(255) NOT NULL,
    body        TEXT,
    link_type   VARCHAR(50),   -- 'kpi', 'approval', 'user'
    link_id     UUID,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_own_notifications"
    ON notifications FOR SELECT TO authenticated
    USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));


-- =============================================================================
-- TABLE: audit_log
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id     UUID REFERENCES users (id) ON DELETE SET NULL,
    action       VARCHAR(100) NOT NULL,     -- e.g. 'kpi.created', 'approval.approved'
    entity_type  VARCHAR(50)  NOT NULL,     -- 'kpi', 'user', 'approval', 'region'
    entity_id    UUID,
    old_data     JSONB,
    new_data     JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id    ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity      ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created     ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_audit_log" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);


-- =============================================================================
-- SEED: update regions with flag + color
-- =============================================================================

UPDATE regions SET flag = '🌏', color = '#1854a8', description = 'Asia Pacific headquarters region'           WHERE code = 'APAC';
UPDATE regions SET flag = '🇮🇳', color = '#1a7a4a', description = 'India operations covering all metro zones'  WHERE code = 'IND';
UPDATE regions SET flag = '🇨🇳', color = '#b91c1c', description = 'China operations across key markets'        WHERE code = 'CHN';
UPDATE regions SET flag = '🌴', color = '#b45309', description = 'South East Asia across Singapore, Thailand'  WHERE code = 'SEA';


-- =============================================================================
-- END
-- =============================================================================
