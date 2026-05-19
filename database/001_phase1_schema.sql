-- =============================================================================
-- JOOLA Track — Phase 1 Database Schema
-- File: 001_phase1_schema.sql
-- Database: Supabase (PostgreSQL)
-- Phase 1 Scope: Regions, Users, KPIs, KPI Contributors, KPI Cascade
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE kpi_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE kpi_type AS ENUM ('quantitative', 'qualitative');
CREATE TYPE kpi_period AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE update_frequency AS ENUM ('weekly', 'monthly', 'quarterly');
CREATE TYPE contributor_role AS ENUM ('owner', 'contributor');


-- =============================================================================
-- TABLE: regions
-- Description: Master list of geographic regions (APAC, India, China, SEA)
-- =============================================================================

CREATE TABLE regions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(10)  NOT NULL UNIQUE,       -- e.g. APAC, IND, CHN, SEA
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regions_code ON regions (code);

COMMENT ON TABLE  regions       IS 'Geographic regions used for KPI scoping and user assignment';
COMMENT ON COLUMN regions.code  IS 'Short uppercase code used in KPI numbering e.g. IND, CHN';


-- =============================================================================
-- TABLE: users
-- Description: All employees / system users. Self-referential via manager_id.
--              Supabase Auth UID is stored in auth_id (foreign key to auth.users).
-- =============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id         UUID UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
    employee_code   VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. EMP-001
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    designation     VARCHAR(150),
    department      VARCHAR(100),
    region_id       UUID REFERENCES regions (id) ON DELETE SET NULL,
    manager_id      UUID REFERENCES users   (id) ON DELETE SET NULL,  -- org tree
    is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    status          user_status  NOT NULL DEFAULT 'active',
    profile_image   TEXT,                           -- Supabase Storage URL
    joined_at       DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id    ON users (auth_id);
CREATE INDEX idx_users_email      ON users (email);
CREATE INDEX idx_users_region_id  ON users (region_id);
CREATE INDEX idx_users_manager_id ON users (manager_id);
CREATE INDEX idx_users_status     ON users (status);

COMMENT ON TABLE  users             IS 'All employees and system users';
COMMENT ON COLUMN users.auth_id     IS 'Links to Supabase auth.users — null until user registers';
COMMENT ON COLUMN users.is_admin    IS 'Phase 1 only — full RBAC roles added in Phase 2';
COMMENT ON COLUMN users.manager_id  IS 'Self-reference for org hierarchy tree';


-- =============================================================================
-- TABLE: kpis
-- Description: KPI records. Self-referential via parent_id for cascade hierarchy.
--              KPI number is auto-generated as KPI-{REGION_CODE}-{SEQ}.
-- =============================================================================

CREATE TABLE kpis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_number          VARCHAR(30)  NOT NULL UNIQUE,  -- e.g. KPI-IND-001
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    type                kpi_type     NOT NULL DEFAULT 'quantitative',
    period              kpi_period   NOT NULL DEFAULT 'quarterly',
    update_frequency    update_frequency NOT NULL DEFAULT 'monthly',
    target_value        NUMERIC(18, 4),
    current_value       NUMERIC(18, 4) DEFAULT 0,
    unit                VARCHAR(50),                   -- %, $, count, etc.
    start_date          DATE,
    end_date            DATE,
    next_due_date       DATE,                          -- computed on create/update
    allocation_pct      NUMERIC(5, 2) DEFAULT 100.00, -- % of parent this KPI represents
    status              kpi_status   NOT NULL DEFAULT 'draft',
    region_id           UUID REFERENCES regions (id) ON DELETE SET NULL,
    owner_id            UUID REFERENCES users   (id) ON DELETE SET NULL,
    parent_id           UUID REFERENCES kpis    (id) ON DELETE SET NULL,  -- cascade tree
    level               SMALLINT NOT NULL DEFAULT 0,   -- 0=root, 1, 2, 3
    created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_allocation_pct   CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
    CONSTRAINT chk_dates            CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_current_value    CHECK (current_value >= 0),
    CONSTRAINT chk_level            CHECK (level >= 0 AND level <= 10)
);

CREATE INDEX idx_kpis_kpi_number  ON kpis (kpi_number);
CREATE INDEX idx_kpis_region_id   ON kpis (region_id);
CREATE INDEX idx_kpis_owner_id    ON kpis (owner_id);
CREATE INDEX idx_kpis_parent_id   ON kpis (parent_id);
CREATE INDEX idx_kpis_status      ON kpis (status);
CREATE INDEX idx_kpis_level       ON kpis (level);

COMMENT ON TABLE  kpis                  IS 'KPI records with cascade tree via parent_id';
COMMENT ON COLUMN kpis.kpi_number       IS 'Auto-generated human-readable ID: KPI-{REGION_CODE}-{SEQ}';
COMMENT ON COLUMN kpis.allocation_pct   IS 'What % of the parent KPI this child represents';
COMMENT ON COLUMN kpis.parent_id        IS 'Self-reference — null means root (L0) KPI';
COMMENT ON COLUMN kpis.level            IS '0=root APAC, 1=regional, 2=dept, 3=individual';
COMMENT ON COLUMN kpis.next_due_date    IS 'Computed from created_at + update_frequency';


-- =============================================================================
-- TABLE: kpi_contributors
-- Description: Many-to-many link between KPIs and contributing users.
--              Each row is one user's role on one KPI.
-- =============================================================================

CREATE TABLE kpi_contributors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_id          UUID NOT NULL REFERENCES kpis  (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role            contributor_role NOT NULL DEFAULT 'contributor',
    allocation_pct  NUMERIC(5, 2) DEFAULT 0,      -- individual contribution %
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by     UUID REFERENCES users (id) ON DELETE SET NULL,

    CONSTRAINT uq_kpi_contributor         UNIQUE (kpi_id, user_id),
    CONSTRAINT chk_contrib_allocation_pct CHECK (allocation_pct >= 0 AND allocation_pct <= 100)
);

CREATE INDEX idx_kpi_contributors_kpi_id   ON kpi_contributors (kpi_id);
CREATE INDEX idx_kpi_contributors_user_id  ON kpi_contributors (user_id);

COMMENT ON TABLE  kpi_contributors                  IS 'KPI ↔ user many-to-many with role';
COMMENT ON COLUMN kpi_contributors.allocation_pct   IS 'How much % of this KPI this user is responsible for';
COMMENT ON COLUMN kpi_contributors.role             IS 'owner = primary responsible, contributor = supporting';


-- =============================================================================
-- SEQUENCES: per-region KPI numbering
-- Each region gets its own counter so IDs stay short and readable.
-- =============================================================================

CREATE SEQUENCE kpi_seq_apac START 1;
CREATE SEQUENCE kpi_seq_ind  START 1;
CREATE SEQUENCE kpi_seq_chn  START 1;
CREATE SEQUENCE kpi_seq_sea  START 1;


-- =============================================================================
-- FUNCTION: generate_kpi_number(region_code)
-- Returns the next KPI number for a given region code.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_kpi_number(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq  BIGINT;
    v_code VARCHAR := UPPER(p_region_code);
BEGIN
    IF v_code = 'APAC' THEN
        v_seq := NEXTVAL('kpi_seq_apac');
    ELSIF v_code = 'IND' THEN
        v_seq := NEXTVAL('kpi_seq_ind');
    ELSIF v_code = 'CHN' THEN
        v_seq := NEXTVAL('kpi_seq_chn');
    ELSIF v_code = 'SEA' THEN
        v_seq := NEXTVAL('kpi_seq_sea');
    ELSE
        RAISE EXCEPTION 'Unknown region code: %', p_region_code;
    END IF;

    RETURN 'KPI-' || v_code || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;


-- =============================================================================
-- FUNCTION & TRIGGER: validate_cascade_allocation
-- Ensures the sum of all children's allocation_pct for a parent KPI <= 100.
-- Fires on INSERT and UPDATE of kpis.
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_cascade_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(allocation_pct), 0)
    INTO   v_total
    FROM   kpis
    WHERE  parent_id = NEW.parent_id
      AND  id        <> NEW.id        -- exclude current row on UPDATE
      AND  status    <> 'cancelled';

    IF (v_total + NEW.allocation_pct) > 100 THEN
        RAISE EXCEPTION USING MESSAGE =
            'Cascade allocation overflow: existing children total ' ||
            round(v_total::numeric, 2)::text || '%, adding ' ||
            round(NEW.allocation_pct::numeric, 2)::text || '% exceeds 100%';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cascade_allocation
    BEFORE INSERT OR UPDATE OF allocation_pct, parent_id, status
    ON kpis
    FOR EACH ROW
    EXECUTE FUNCTION validate_cascade_allocation();


-- =============================================================================
-- FUNCTION & TRIGGER: set_kpi_level
-- Auto-sets kpis.level by walking up the parent chain.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_kpi_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_level   SMALLINT := 0;
    v_parent  UUID     := NEW.parent_id;
BEGIN
    WHILE v_parent IS NOT NULL LOOP
        v_level  := v_level + 1;
        SELECT parent_id INTO v_parent FROM kpis WHERE id = v_parent;
    END LOOP;

    NEW.level := v_level;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_kpi_level
    BEFORE INSERT OR UPDATE OF parent_id
    ON kpis
    FOR EACH ROW
    EXECUTE FUNCTION set_kpi_level();


-- =============================================================================
-- FUNCTION & TRIGGER: update_updated_at
-- Generic trigger to keep updated_at current on every row change.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_kpis_updated_at
    BEFORE UPDATE ON kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- Phase 1: Simple is_admin check.
-- Full RBAC policies are added in Phase 2.
-- =============================================================================

ALTER TABLE regions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_contributors ENABLE ROW LEVEL SECURITY;

-- Allow service_role (backend API) unrestricted access
CREATE POLICY "service_role_all_regions"           ON regions          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_users"             ON users            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpis"              ON kpis             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_contributors"  ON kpi_contributors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read all regions
CREATE POLICY "authenticated_read_regions"
    ON regions FOR SELECT TO authenticated
    USING (true);

-- Authenticated users can read all active users
CREATE POLICY "authenticated_read_users"
    ON users FOR SELECT TO authenticated
    USING (status = 'active');

-- Authenticated users can read their own record regardless of status
CREATE POLICY "authenticated_read_own_user"
    ON users FOR SELECT TO authenticated
    USING (auth_id = auth.uid());

-- Authenticated users can read KPIs they own or contribute to
CREATE POLICY "authenticated_read_kpis"
    ON kpis FOR SELECT TO authenticated
    USING (
        owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR
        id IN (
            SELECT kpi_id FROM kpi_contributors
            WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Authenticated users can read their own KPI contributor rows
CREATE POLICY "authenticated_read_kpi_contributors"
    ON kpi_contributors FOR SELECT TO authenticated
    USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );


-- =============================================================================
-- SEED DATA: Regions
-- =============================================================================

INSERT INTO regions (id, name, code) VALUES
    (uuid_generate_v4(), 'Asia Pacific', 'APAC'),
    (uuid_generate_v4(), 'India',        'IND'),
    (uuid_generate_v4(), 'China',        'CHN'),
    (uuid_generate_v4(), 'South East Asia', 'SEA')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- SEED DATA: Admin user (placeholder — replace auth_id after Supabase Auth setup)
-- =============================================================================

INSERT INTO users (
    employee_code, full_name, email, department, is_admin, status
) VALUES (
    'EMP-001', 'Admin User', 'admin@joola.in', 'Group Leadership', TRUE, 'active'
)
ON CONFLICT (email) DO NOTHING;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
