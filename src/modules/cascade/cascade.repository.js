const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const getAllocatedPct = async (parentId, excludeId = null) => {
  let query = supabase
    .from('kpis')
    .select('allocation_pct')
    .eq('parent_id', parentId)
    .neq('status', 'cancelled');

  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data.reduce((sum, row) => sum + Number(row.allocation_pct), 0);
};

const getCascade = async (parentId) => {
  const { data, error } = await supabase
    .from('kpis')
    .select(`
      id, kpi_number, name, status, allocation_pct, level, next_due_date,
      owner:users!kpis_owner_id_fkey(id, full_name)
    `)
    .eq('parent_id', parentId)
    .neq('status', 'cancelled')
    .order('kpi_number');

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');

  // Compute remaining allocation for the parent
  const used = data.reduce((sum, row) => sum + Number(row.allocation_pct), 0);
  return { children: data, allocated_pct: used, remaining_pct: 100 - used };
};

const cancelKpi = async (id) => {
  const { error } = await supabase
    .from('kpis')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
};

// Contributors
const upsertContributor = async (kpiId, userId, role, allocationPct, assignedBy) => {
  const { data, error } = await supabase
    .from('kpi_contributors')
    .upsert(
      { kpi_id: kpiId, user_id: userId, role, allocation_pct: allocationPct, assigned_by: assignedBy, assigned_at: new Date().toISOString() },
      { onConflict: 'kpi_id,user_id' }
    )
    .select('id, kpi_id, user_id, role, allocation_pct')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const removeContributor = async (kpiId, userId) => {
  const { error } = await supabase
    .from('kpi_contributors')
    .delete()
    .eq('kpi_id', kpiId)
    .eq('user_id', userId);

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return true;
};

module.exports = { getAllocatedPct, getCascade, cancelKpi, upsertContributor, removeContributor };
