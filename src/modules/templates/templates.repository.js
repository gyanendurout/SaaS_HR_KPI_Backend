const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const findAll = async () => {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('id, name, category, icon, fields, used_in, is_default, created_by, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('name');
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const findById = async (id) => {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('id, name, category, icon, fields, used_in, is_default, created_by, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw new AppError('Template not found', 404, 'NOT_FOUND');
  return data;
};

const create = async (payload) => {
  const { data, error } = await supabase
    .from('kpi_templates')
    .insert(payload)
    .select('id, name, category, icon, fields, used_in, is_default, created_by, created_at')
    .single();
  if (error) throw new AppError(error.message, 400, 'DB_ERROR');
  return data;
};

const update = async (id, payload) => {
  const { data, error } = await supabase
    .from('kpi_templates')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, category, icon, fields, used_in, updated_at')
    .single();
  if (error) throw new AppError(error.message, 400, 'DB_ERROR');
  if (!data) throw new AppError('Template not found', 404, 'NOT_FOUND');
  return data;
};

const remove = async (id) => {
  const { error } = await supabase.from('kpi_templates').delete().eq('id', id);
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
};

module.exports = { findAll, findById, create, update, remove };
