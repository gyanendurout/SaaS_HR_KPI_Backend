-- =============================================================================
-- JOOLA Track — PostgreSQL RPC Functions
-- File: 003_rpc_functions.sql
-- Run this in Supabase SQL Editor AFTER 001_phase1_schema.sql
-- =============================================================================


-- =============================================================================
-- FUNCTION: get_kpi_tree(p_root_id)
-- Returns the full subtree of a KPI as a flat array ordered by level.
-- Called by the backend via supabase.rpc('get_kpi_tree', { p_root_id: id })
-- =============================================================================

CREATE OR REPLACE FUNCTION get_kpi_tree(p_root_id UUID)
RETURNS TABLE (
    id              UUID,
    kpi_number      VARCHAR,
    name            VARCHAR,
    parent_id       UUID,
    allocation_pct  NUMERIC,
    status          TEXT,
    level           SMALLINT,
    owner_name      TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE kpi_tree AS (
        SELECT
            k.id, k.kpi_number, k.name, k.parent_id,
            k.allocation_pct, k.status::TEXT, k.level
        FROM kpis k
        WHERE k.id = p_root_id

        UNION ALL

        SELECT
            k.id, k.kpi_number, k.name, k.parent_id,
            k.allocation_pct, k.status::TEXT, k.level
        FROM kpis k
        JOIN kpi_tree kt ON kt.id = k.parent_id
        WHERE k.status <> 'cancelled'
    )
    SELECT
        kt.id, kt.kpi_number, kt.name, kt.parent_id,
        kt.allocation_pct, kt.status, kt.level,
        u.full_name AS owner_name
    FROM kpi_tree kt
    LEFT JOIN kpis k2  ON k2.id = kt.id
    LEFT JOIN users u  ON u.id  = k2.owner_id
    ORDER BY kt.level, kt.kpi_number;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION get_kpi_tree(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION generate_kpi_number(VARCHAR) TO service_role;


-- =============================================================================
-- END
-- =============================================================================
