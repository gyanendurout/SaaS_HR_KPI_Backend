const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const findForUser = async (userId, { page = 1, limit = 20, unread_only = false } = {}) => {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (unread_only) query = query.eq('is_read', false);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { data, total: count, page, limit };
};

const countUnread = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
};

const create = async ({ user_id, type, title, body, link_type, link_id }) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id, type, title, body, link_type, link_id })
    .select('id, user_id, type, title, is_read, created_at')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const markRead = async (id, userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, is_read')
    .single();

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return data;
};

const markAllRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new AppError(error.message, 500, 'DB_ERROR');
  return { success: true };
};

module.exports = { findForUser, countUnread, create, markRead, markAllRead };
