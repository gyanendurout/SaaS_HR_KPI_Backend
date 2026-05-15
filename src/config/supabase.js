const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY        = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const sharedOptions = {
  auth: { persistSession: false },
  realtime: { transport: ws },  // required for Node < 22
};

// Service-role client — bypasses RLS, used by all repository layers
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, sharedOptions);

// Anon client — used for auth operations (login, verify JWT)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, sharedOptions);

// Admin auth client — used for creating/managing auth users server-side
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, sharedOptions);

module.exports = { supabase, supabaseAnon, supabaseAdmin };
