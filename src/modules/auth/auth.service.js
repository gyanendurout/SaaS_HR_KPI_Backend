const { supabase, supabaseAnon, supabaseAdmin } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const login = async (email, password) => {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) throw new AppError(error.message, 401, 'INVALID_CREDENTIALS');

  // Load user record from our users table
  const { data: dbUser, error: dbErr } = await supabase
    .from('users')
    .select('id, employee_code, full_name, email, is_admin, status, region_id, manager_id')
    .eq('auth_id', data.user.id)
    .eq('status', 'active')
    .single();

  if (dbErr || !dbUser) throw new AppError('User account not found or inactive', 401, 'UNAUTHORIZED');

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: dbUser,
  };
};

const logout = async (accessToken) => {
  // Sign out the specific user session by passing the JWT scope
  await supabaseAdmin.auth.admin.signOut(accessToken);
  return true;
};

module.exports = { login, logout };
