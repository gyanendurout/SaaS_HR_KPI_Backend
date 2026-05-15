const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const findAll = async () => {
  const { data, error } = await supabase
    .from('regions')
    .select('id, name, code, created_at')
    .order('name');

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const findById = async (id) => {
  const { data, error } = await supabase
    .from('regions')
    .select('id, name, code, created_at')
    .eq('id', id)
    .single();

  if (error) throw new AppError('Region not found', 404, 'NOT_FOUND');
  return data;
};

module.exports = { findAll, findById };
