-- =============================================================================
-- JOOLA Track — Phase 1 Common Query Reference
-- File: 002_phase1_queries.sql
-- These are the exact queries the backend API services will execute.
-- =============================================================================


-- =============================================================================
-- REGIONS
-- =============================================================================

-- List all regions
SELECT id, name, code, created_at
FROM   regions
ORDER  BY name;

-- Get region by code
SELECT id, name, code
FROM   regions
WHERE  code = 'IND';


-- =============================================================================
-- USERS — Auth & Profile
-- =============================================================================

-- Get user by Supabase auth UID (used in JWT middleware)
SELECT u.id, u.auth_id, u.employee_code, u.full_name, u.email,
       u.is_admin, u.status, u.region_id, u.manager_id, r.code AS region_code
FROM   users u
LEFT   JOIN regions r ON r.id = u.region_id
WHERE  u.auth_id = $1
  AND  u.status  = 'active';

-- Link auth_id to existing user record (called after Supabase sign-up)
UPDATE users
SET    auth_id    = $1,
       updated_at = NOW()
WHERE  email = $2
RETURNING id, auth_id, employee_code, full_name, email, is_admin, status;


-- =============================================================================
-- USERS — CRUD
-- =============================================================================

-- List all users (paginated) with region name
SELECT u.id, u.employee_code, u.full_name, u.email, u.designation,
       u.department, u.status, u.is_admin, u.joined_at,
       r.name AS region_name, r.code AS region_code,
       m.full_name AS manager_name
FROM   users u
LEFT   JOIN regions r ON r.id = u.region_id
LEFT   JOIN users   m ON m.id = u.manager_id
ORDER  BY u.full_name
LIMIT  $1 OFFSET $2;

-- Count users (for pagination)
SELECT COUNT(*) AS total FROM users;

-- Get single user by ID
SELECT u.id, u.employee_code, u.full_name, u.email, u.phone,
       u.designation, u.department, u.status, u.is_admin,
       u.joined_at, u.profile_image,
       u.region_id, r.name AS region_name, r.code AS region_code,
       u.manager_id, m.full_name AS manager_name,
       u.created_at, u.updated_at
FROM   users u
LEFT   JOIN regions r ON r.id = u.region_id
LEFT   JOIN users   m ON m.id = u.manager_id
WHERE  u.id = $1;

-- Create user
INSERT INTO users (
    employee_code, full_name, email, phone,
    designation, department, region_id, manager_id,
    is_admin, status, joined_at
) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7, $8,
    $9, $10, $11
)
RETURNING id, employee_code, full_name, email, is_admin, status, created_at;

-- Update user
UPDATE users
SET    full_name     = COALESCE($2, full_name),
       phone         = COALESCE($3, phone),
       designation   = COALESCE($4, designation),
       department    = COALESCE($5, department),
       region_id     = COALESCE($6, region_id),
       manager_id    = COALESCE($7, manager_id),
       is_admin      = COALESCE($8, is_admin),
       joined_at     = COALESCE($9, joined_at),
       updated_at    = NOW()
WHERE  id = $1
RETURNING id, employee_code, full_name, email, is_admin, status, updated_at;

-- Soft delete user (deactivate)
UPDATE users
SET    status     = 'inactive',
       updated_at = NOW()
WHERE  id = $1
RETURNING id, status, updated_at;

-- Get next employee code
SELECT 'EMP-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0') AS next_code
FROM   users;

-- Search users by name or email
SELECT u.id, u.employee_code, u.full_name, u.email, u.designation, u.status
FROM   users u
WHERE  (u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
  AND  u.status = 'active'
ORDER  BY u.full_name
LIMIT  20;


-- =============================================================================
-- USERS — Org Tree
-- =============================================================================

-- Get direct reports of a manager
SELECT u.id, u.employee_code, u.full_name, u.designation, u.status
FROM   users u
WHERE  u.manager_id = $1
  AND  u.status     = 'active'
ORDER  BY u.full_name;

-- Get full org tree for a root user (recursive CTE)
WITH RECURSIVE org_tree AS (
    -- Anchor: the root user
    SELECT id, full_name, designation, manager_id, 0 AS depth
    FROM   users
    WHERE  id = $1

    UNION ALL

    -- Recursive: direct reports
    SELECT u.id, u.full_name, u.designation, u.manager_id, ot.depth + 1
    FROM   users u
    JOIN   org_tree ot ON ot.id = u.manager_id
    WHERE  u.status = 'active'
)
SELECT * FROM org_tree ORDER BY depth, full_name;


-- =============================================================================
-- KPIs — CRUD
-- =============================================================================

-- List KPIs (paginated) with owner, region, parent
SELECT k.id, k.kpi_number, k.name, k.type, k.status, k.period,
       k.target_value, k.current_value, k.unit, k.allocation_pct,
       k.start_date, k.end_date, k.next_due_date, k.level,
       r.name AS region_name, r.code AS region_code,
       o.full_name AS owner_name,
       p.kpi_number AS parent_kpi_number, p.name AS parent_name
FROM   kpis k
LEFT   JOIN regions r ON r.id = k.region_id
LEFT   JOIN users   o ON o.id = k.owner_id
LEFT   JOIN kpis    p ON p.id = k.parent_id
ORDER  BY k.level, k.kpi_number
LIMIT  $1 OFFSET $2;

-- Count KPIs (for pagination)
SELECT COUNT(*) AS total FROM kpis;

-- Get single KPI by ID with all details
SELECT k.id, k.kpi_number, k.name, k.description, k.type, k.status,
       k.period, k.update_frequency, k.target_value, k.current_value,
       k.unit, k.start_date, k.end_date, k.next_due_date,
       k.allocation_pct, k.level,
       k.region_id, r.name AS region_name, r.code AS region_code,
       k.owner_id, o.full_name AS owner_name,
       k.parent_id, p.kpi_number AS parent_kpi_number, p.name AS parent_name,
       k.created_by, cb.full_name AS created_by_name,
       k.created_at, k.updated_at
FROM   kpis k
LEFT   JOIN regions r  ON r.id  = k.region_id
LEFT   JOIN users   o  ON o.id  = k.owner_id
LEFT   JOIN kpis    p  ON p.id  = k.parent_id
LEFT   JOIN users   cb ON cb.id = k.created_by
WHERE  k.id = $1;

-- Get KPI with its contributors
SELECT kc.id, kc.user_id, u.full_name, u.email, u.designation,
       kc.role, kc.allocation_pct, kc.assigned_at
FROM   kpi_contributors kc
JOIN   users u ON u.id = kc.user_id
WHERE  kc.kpi_id = $1
ORDER  BY kc.role DESC, u.full_name;

-- Create KPI (kpi_number generated by backend using generate_kpi_number())
INSERT INTO kpis (
    kpi_number, name, description, type, period, update_frequency,
    target_value, unit, start_date, end_date, next_due_date,
    allocation_pct, status, region_id, owner_id, parent_id, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11,
    $12, $13, $14, $15, $16, $17
)
RETURNING id, kpi_number, name, status, created_at;

-- Generate next KPI number for a region
SELECT generate_kpi_number($1);   -- $1 = region code e.g. 'IND'

-- Update KPI
UPDATE kpis
SET    name               = COALESCE($2,  name),
       description        = COALESCE($3,  description),
       type               = COALESCE($4,  type),
       period             = COALESCE($5,  period),
       update_frequency   = COALESCE($6,  update_frequency),
       target_value       = COALESCE($7,  target_value),
       current_value      = COALESCE($8,  current_value),
       unit               = COALESCE($9,  unit),
       start_date         = COALESCE($10, start_date),
       end_date           = COALESCE($11, end_date),
       next_due_date      = COALESCE($12, next_due_date),
       allocation_pct     = COALESCE($13, allocation_pct),
       status             = COALESCE($14, status),
       owner_id           = COALESCE($15, owner_id),
       updated_at         = NOW()
WHERE  id = $1
RETURNING id, kpi_number, name, status, updated_at;

-- Soft-cancel KPI
UPDATE kpis
SET    status     = 'cancelled',
       updated_at = NOW()
WHERE  id = $1
RETURNING id, kpi_number, status, updated_at;

-- Filter KPIs by status
SELECT k.id, k.kpi_number, k.name, k.status, k.level
FROM   kpis k
WHERE  k.status = $1
ORDER  BY k.kpi_number;

-- Filter KPIs by owner
SELECT k.id, k.kpi_number, k.name, k.status, k.level, k.next_due_date
FROM   kpis k
WHERE  k.owner_id = $1
ORDER  BY k.kpi_number;

-- Filter KPIs by region
SELECT k.id, k.kpi_number, k.name, k.status, k.level, k.owner_id
FROM   kpis k
WHERE  k.region_id = $1
ORDER  BY k.level, k.kpi_number;


-- =============================================================================
-- KPI CASCADE — Tree Queries
-- =============================================================================

-- Get all direct children of a KPI
SELECT k.id, k.kpi_number, k.name, k.status, k.allocation_pct, k.level,
       o.full_name AS owner_name
FROM   kpis k
LEFT   JOIN users o ON o.id = k.owner_id
WHERE  k.parent_id = $1
  AND  k.status   <> 'cancelled'
ORDER  BY k.kpi_number;

-- Get full subtree of a KPI (recursive CTE)
WITH RECURSIVE kpi_tree AS (
    -- Anchor: the root KPI
    SELECT id, kpi_number, name, parent_id, allocation_pct, status, level
    FROM   kpis
    WHERE  id = $1

    UNION ALL

    -- Recursive: children
    SELECT k.id, k.kpi_number, k.name, k.parent_id, k.allocation_pct, k.status, k.level
    FROM   kpis k
    JOIN   kpi_tree kt ON kt.id = k.parent_id
    WHERE  k.status <> 'cancelled'
)
SELECT * FROM kpi_tree ORDER BY level, kpi_number;

-- Get all ancestors of a KPI (walk up to root)
WITH RECURSIVE kpi_ancestors AS (
    SELECT id, kpi_number, name, parent_id, level
    FROM   kpis
    WHERE  id = $1

    UNION ALL

    SELECT k.id, k.kpi_number, k.name, k.parent_id, k.level
    FROM   kpis k
    JOIN   kpi_ancestors ka ON ka.parent_id = k.id
)
SELECT * FROM kpi_ancestors ORDER BY level;

-- Check total allocated % for children of a parent (before adding new child)
SELECT COALESCE(SUM(allocation_pct), 0) AS total_allocated
FROM   kpis
WHERE  parent_id = $1
  AND  status   <> 'cancelled';

-- Get KPI cascade summary for a parent
SELECT
    k.id, k.kpi_number, k.name, k.allocation_pct, k.status,
    o.full_name AS owner_name,
    (SELECT COALESCE(SUM(c.allocation_pct), 0) FROM kpis c WHERE c.parent_id = k.id AND c.status <> 'cancelled') AS children_total_pct
FROM   kpis k
LEFT   JOIN users o ON o.id = k.owner_id
WHERE  k.parent_id = $1
ORDER  BY k.kpi_number;


-- =============================================================================
-- KPI CONTRIBUTORS — CRUD
-- =============================================================================

-- Add contributor to KPI
INSERT INTO kpi_contributors (kpi_id, user_id, role, allocation_pct, assigned_by)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (kpi_id, user_id) DO UPDATE
    SET role           = EXCLUDED.role,
        allocation_pct = EXCLUDED.allocation_pct,
        assigned_by    = EXCLUDED.assigned_by,
        assigned_at    = NOW()
RETURNING id, kpi_id, user_id, role, allocation_pct;

-- Remove contributor from KPI
DELETE FROM kpi_contributors
WHERE kpi_id = $1 AND user_id = $2
RETURNING id;

-- Get all KPIs for a user (as owner or contributor)
SELECT DISTINCT k.id, k.kpi_number, k.name, k.status, k.level,
       k.target_value, k.current_value, k.next_due_date
FROM   kpis k
LEFT   JOIN kpi_contributors kc ON kc.kpi_id = k.id
WHERE  (k.owner_id = $1 OR kc.user_id = $1)
  AND  k.status  <> 'cancelled'
ORDER  BY k.kpi_number;


-- =============================================================================
-- DASHBOARD — Aggregation Queries
-- =============================================================================

-- KPI status summary counts
SELECT
    COUNT(*)                                            AS total,
    COUNT(*) FILTER (WHERE status = 'active')           AS active,
    COUNT(*) FILTER (WHERE status = 'draft')            AS draft,
    COUNT(*) FILTER (WHERE status = 'completed')        AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled')        AS cancelled
FROM kpis;

-- KPI stats per region
SELECT
    r.name AS region_name, r.code,
    COUNT(k.id)                                         AS total_kpis,
    COUNT(k.id) FILTER (WHERE k.status = 'active')      AS active_kpis,
    COUNT(k.id) FILTER (WHERE k.status = 'completed')   AS completed_kpis
FROM   regions r
LEFT   JOIN kpis k ON k.region_id = r.id
GROUP  BY r.id, r.name, r.code
ORDER  BY r.name;

-- Overdue KPIs (next_due_date < today and status = active)
SELECT k.id, k.kpi_number, k.name, k.next_due_date,
       o.full_name AS owner_name, r.code AS region_code
FROM   kpis k
LEFT   JOIN users   o ON o.id = k.owner_id
LEFT   JOIN regions r ON r.id = k.region_id
WHERE  k.next_due_date < CURRENT_DATE
  AND  k.status = 'active'
ORDER  BY k.next_due_date;

-- User count summary
SELECT
    COUNT(*)                                            AS total_users,
    COUNT(*) FILTER (WHERE status = 'active')           AS active_users,
    COUNT(*) FILTER (WHERE is_admin = TRUE)             AS admins
FROM users;

-- =============================================================================
-- END OF QUERY REFERENCE
-- =============================================================================
