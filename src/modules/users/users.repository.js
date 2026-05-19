const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const BASE_SELECT = `
  id, employee_code, full_name, email, phone,
  designation, department, status, is_admin, joined_at, profile_image,
  region_id, manager_id
`;

const findAll = async ({ page = 1, limit = 20, search, status } = {}) => {
  let query = supabase
    .from('users')
    .select(BASE_SELECT, { count: 'exact' })
    .order('full_name')
    .range((page - 1) * limit, page * limit - 1);

  if (status) query = query.eq('status', status);
  if (search) {
    // Strip PostgREST filter delimiters and ilike wildcards so untrusted input
    // can't break out of the search expression into additional filters.
    const safe = String(search).replace(/[,()%*]/g, '').trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { data, total: count, page, limit };
};

const findById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select(BASE_SELECT + ', created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) throw new AppError('User not found', 404, 'NOT_FOUND');
  return data;
};

const findByAuthId = async (authId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, auth_id, employee_code, full_name, email, is_admin, status, region_id, manager_id')
    .eq('auth_id', authId)
    .eq('status', 'active')
    .single();

  if (error) return null;
  return data;
};

const getNextEmployeeCode = async () => {
  // Use MAX(employee_code) instead of COUNT to avoid race conditions where
  // two concurrent creates get the same count and collide on the UNIQUE constraint.
  const { data } = await supabase
    .from('users')
    .select('employee_code')
    .order('employee_code', { ascending: false })
    .limit(1)
    .single();

  if (!data) return 'EMP-001';
  const last = parseInt(data.employee_code.replace('EMP-', ''), 10) || 0;
  return `EMP-${String(last + 1).padStart(3, '0')}`;
};

const create = async (payload) => {
  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select('id, employee_code, full_name, email, is_admin, status, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('Email already exists', 409, 'CONFLICT');
    throw new AppError(error.message, 500, 'DB_ERROR');
  }
  return data;
};

const update = async (id, payload) => {
  const { data, error } = await supabase
    .from('users')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, employee_code, full_name, email, is_admin, status, updated_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  if (!data) throw new AppError('User not found', 404, 'NOT_FOUND');
  return data;
};

const deactivate = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, updated_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  if (!data) throw new AppError('User not found', 404, 'NOT_FOUND');
  return data;
};

const findDirectReports = async (managerId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, employee_code, full_name, designation, status')
    .eq('manager_id', managerId)
    .eq('status', 'active')
    .order('full_name');

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const findUserKpis = async (userId) => {
  // Fetch owned KPIs and contributed KPIs separately — PostgREST .or() cannot
  // filter across joined tables, so a cross-table OR must be done in two queries.
  // Use OR on owner_id/created_by to catch KPIs created before the owner_id default was set.
  const [owned, contributed] = await Promise.all([
    supabase
      .from('kpis')
      .select('id, kpi_number, name, status, level, target_value, current_value, next_due_date, unit, owner_id, update_frequency')
      .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
      .neq('status', 'cancelled'),
    supabase
      .from('kpi_contributors')
      .select('kpi_id')
      .eq('user_id', userId),
  ]);

  if (owned.error) throw new AppError(owned.error.message, 500, 'DB_ERROR');
  if (contributed.error) throw new AppError(contributed.error.message, 500, 'DB_ERROR');

  // Fetch contributed KPIs by ID
  const contributedIds = (contributed.data || []).map((r) => r.kpi_id).filter(Boolean);
  let contributedKpis = [];
  if (contributedIds.length > 0) {
    const { data: ck, error: cke } = await supabase
      .from('kpis')
      .select('id, kpi_number, name, status, level, target_value, current_value, next_due_date, unit, owner_id, update_frequency')
      .in('id', contributedIds)
      .neq('status', 'cancelled');
    if (cke) throw new AppError(cke.message, 500, 'DB_ERROR');
    contributedKpis = ck || [];
  }

  // Merge and deduplicate by id
  const seen = new Set();
  const results = [];
  for (const row of (owned.data || [])) {
    if (!seen.has(row.id)) { seen.add(row.id); results.push(row); }
  }
  for (const row of contributedKpis) {
    if (!seen.has(row.id)) { seen.add(row.id); results.push(row); }
  }
  return results.sort((a, b) => a.kpi_number.localeCompare(b.kpi_number));
};

const hardDelete = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
};

module.exports = { findAll, findById, findByAuthId, getNextEmployeeCode, create, update, deactivate, hardDelete, findDirectReports, findUserKpis };
