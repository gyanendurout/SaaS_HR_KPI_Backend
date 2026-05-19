-- =============================================================================
-- FIX: validate_cascade_allocation trigger error message formatting
-- PostgreSQL RAISE EXCEPTION does not support C-style %.2f format specifiers.
-- Replace with string concatenation using round() + ::text cast.
-- Run this in the Supabase SQL Editor to fix the "100.00.2f%" display bug.
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
      AND  id        <> NEW.id
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
