const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const BASE_SELECT = `
  id, kpi_number, name, description, type, period, update_frequency,
  target_value, current_value, unit, start_date, end_date, next_due_date,
  allocation_pct, status, level, created_at, updated_at,
  region_id, owner_id, parent_id
`;

const findAll = async ({ page = 1, limit = 20, status, owner_id, region_id } = {}) => {
  let query = supabase
    .from('kpis')
    .select(BASE_SELECT, { count: 'exact' })
    .order('level')
    .order('kpi_number')
    .range((page - 1) * limit, page * limit - 1);

  if (status)    query = query.eq('status', status);
  if (owner_id)  query = query.or(`owner_id.eq.${owner_id},created_by.eq.${owner_id}`);
  if (region_id) query = query.eq('region_id', region_id);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { data, total: count, page, limit };
};

const findById = async (id) => {
  const { data, error } = await supabase
    .from('kpis')
    .select(BASE_SELECT + `, kpi_contributors(id, user_id, role, allocation_pct)`)
    .eq('id', id)
    .single();

  if (error) throw new AppError('KPI not found', 404, 'NOT_FOUND');
  return data;
};

const create = async (payload) => {
  const { data, error } = await supabase
    .from('kpis')
    .insert(payload)
    .select('id, kpi_number, name, status, level, created_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const update = async (id, payload) => {
  const { data, error } = await supabase
    .from('kpis')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, kpi_number, name, status, updated_at')
    .single();

  if (error) {
    // Postgres trigger raises exception for allocation overflow
    if (error.message.includes('Cascade allocation overflow')) {
      throw new AppError(error.message, 409, 'ALLOCATION_OVERFLOW');
    }
    throw new AppError(error.message, 500, 'DB_ERROR');
  }
  if (!data) throw new AppError('KPI not found', 404, 'NOT_FOUND');
  return data;
};

const cancel = async (id) => {
  const { data, error } = await supabase
    .from('kpis')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, kpi_number, status, updated_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  if (!data) throw new AppError('KPI not found', 404, 'NOT_FOUND');
  return data;
};

const findChildren = async (parentId) => {
  const { data, error } = await supabase
    .from('kpis')
    .select('id, kpi_number, name, status, allocation_pct, level, owner_id')
    .eq('parent_id', parentId)
    .neq('status', 'cancelled')
    .order('kpi_number');

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

// Recursive tree via RPC (calls generate_kpi_number postgres function for numbering)
const findTree = async (rootId) => {
  const { data, error } = await supabase.rpc('get_kpi_tree', { p_root_id: rootId });
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const generateKpiNumber = async (regionCode) => {
  const { data, error } = await supabase.rpc('generate_kpi_number', { p_region_code: regionCode });
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const getAllocatedPct = async (parentId) => {
  const { data, error } = await supabase
    .from('kpis')
    .select('allocation_pct')
    .eq('parent_id', parentId)
    .neq('status', 'cancelled');

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data.reduce((sum, row) => sum + Number(row.allocation_pct), 0);
};

module.exports = { findAll, findById, create, update, cancel, findChildren, findTree, generateKpiNumber, getAllocatedPct };
