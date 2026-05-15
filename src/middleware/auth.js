const AppError = require('../utils/AppError');
const { supabase, supabaseAnon } = require('../config/supabase');

// Verifies the Supabase JWT from Authorization header and loads the user record
const auth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHORIZED'));
    }

    const token = header.slice(7);

    // Verify JWT via Supabase Auth API
    const { data: { user: authUser }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !authUser) {
      return next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
    }

    // Load full user record from our users table
    const { data: dbUser, error: dbErr } = await supabase
      .from('users')
      .select('id, auth_id, employee_code, full_name, email, is_admin, status, region_id, manager_id')
      .eq('auth_id', authUser.id)
      .eq('status', 'active')
      .single();

    if (dbErr || !dbUser) {
      return next(new AppError('User account not found or inactive', 401, 'UNAUTHORIZED'));
    }

    req.user = dbUser;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = auth;
