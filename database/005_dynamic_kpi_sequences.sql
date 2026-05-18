-- =============================================================================
-- Migration 005: Dynamic KPI number sequences
-- Replaces the hardcoded APAC/IND/CHN/SEA sequences with a generic table-based
-- counter so any region code works without schema changes.
-- =============================================================================

-- Sequence counter table — one row per region code, auto-created on first use
CREATE TABLE IF NOT EXISTS kpi_number_sequences (
  region_code VARCHAR(20) PRIMARY KEY,
  last_seq     BIGINT NOT NULL DEFAULT 0
);

-- Seed with current max numbers so existing KPIs are not duplicated
INSERT INTO kpi_number_sequences (region_code, last_seq)
SELECT
  UPPER(r.code),
  COALESCE(
    MAX(
      CAST(
        SUBSTRING(k.kpi_number FROM LENGTH('KPI-' || UPPER(r.code) || '-') + 1)
        AS BIGINT
      )
    ),
    0
  )
FROM regions r
LEFT JOIN kpis k
  ON k.kpi_number LIKE 'KPI-' || UPPER(r.code) || '-%'
GROUP BY r.code
ON CONFLICT (region_code) DO UPDATE
  SET last_seq = EXCLUDED.last_seq;

-- Replace the function — works for any region code, no pre-registration needed
CREATE OR REPLACE FUNCTION generate_kpi_number(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq  BIGINT;
    v_code VARCHAR := UPPER(p_region_code);
BEGIN
    INSERT INTO kpi_number_sequences (region_code, last_seq)
    VALUES (v_code, 1)
    ON CONFLICT (region_code)
    DO UPDATE SET last_seq = kpi_number_sequences.last_seq + 1
    RETURNING last_seq INTO v_seq;

    RETURN 'KPI-' || v_code || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_kpi_number(VARCHAR) TO service_role;
GRANT ALL ON TABLE kpi_number_sequences TO service_role;
