const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const BASE_SELECT = `
  id, kpi_id, requested_by, reviewed_by, status, note, reviewer_note,
  requested_at, reviewed_at, created_at, updated_at,
  kpis(id, kpi_number, name, status),
  requester:users!approvals_requested_by_fkey(id, full_name, employee_code, designation),
  reviewer:users!approvals_reviewed_by_fkey(id, full_name, employee_code, designation)
`;

const findAll = async ({ page = 1, limit = 20, status, kpi_id, requested_by } = {}) => {
  let query = supabase
    .from('approvals')
    .select(BASE_SELECT, { count: 'exact' })
    .order('requested_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status)       query = query.eq('status', status);
  if (kpi_id)       query = query.eq('kpi_id', kpi_id);
  if (requested_by) query = query.eq('requested_by', requested_by);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { data, total: count, page, limit };
};

const findById = async (id) => {
  const { data, error } = await supabase
    .from('approvals')
    .select(BASE_SELECT)
    .eq('id', id)
    .single();

  if (error) throw new AppError('Approval not found', 404, 'NOT_FOUND');
  return data;
};

const findByKpiId = async (kpiId) => {
  const { data, error } = await supabase
    .from('approvals')
    .select(BASE_SELECT)
    .eq('kpi_id', kpiId)
    .order('requested_at', { ascending: false });

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const create = async ({ kpi_id, requested_by, note }) => {
  const { data, error } = await supabase
    .from('approvals')
    .insert({ kpi_id, requested_by, note, status: 'pending' })
    .select('id, kpi_id, status, requested_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const updateStatus = async (id, { status, reviewed_by, reviewer_note }) => {
  const { data, error } = await supabase
    .from('approvals')
    .update({ status, reviewed_by, reviewer_note, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, kpi_id, status, reviewed_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  if (!data) throw new AppError('Approval not found', 404, 'NOT_FOUND');
  return data;
};

const countPending = async () => {
  const { count, error } = await supabase
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
};

module.exports = { findAll, findById, findByKpiId, create, updateStatus, countPending };
