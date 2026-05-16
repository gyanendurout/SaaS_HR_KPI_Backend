const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const log = async ({ actor_id, action, entity_type, entity_id, old_data, new_data, ip_address }) => {
  const { error } = await supabase
    .from('audit_log')
    .insert({ actor_id, action, entity_type, entity_id, old_data, new_data, ip_address });

  if (error) console.error('[audit] failed to write log:', error.message);
};

const findAll = async ({ page = 1, limit = 30, entity_type, actor_id, action } = {}) => {
  let query = supabase
    .from('audit_log')
    .select(`
      id, action, entity_type, entity_id, ip_address, created_at,
      actor:users!audit_log_actor_id_fkey(id, full_name, employee_code)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (entity_type) query = query.eq('entity_type', entity_type);
  if (actor_id)    query = query.eq('actor_id', actor_id);
  if (action) {
    const safe = String(action).replace(/[,()%*]/g, '').trim();
    if (safe) query = query.ilike('action', `%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { data, total: count, page, limit };
};

module.exports = { log, findAll };
