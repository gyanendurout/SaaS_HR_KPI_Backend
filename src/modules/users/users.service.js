const { supabaseAdmin } = require('../../config/supabase');
const usersRepo = require('./users.repository');
const AppError = require('../../utils/AppError');

const list = async (filters) => usersRepo.findAll(filters);

const getById = async (id) => usersRepo.findById(id);

const create = async (payload) => {
  const employeeCode = await usersRepo.getNextEmployeeCode();

  // Create Supabase Auth account so the user can log in
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes('already registered')) {
      throw new AppError('Email already registered', 409, 'CONFLICT');
    }
    throw new AppError(authErr.message, 500, 'AUTH_ERROR');
  }

  const { password: _pw, ...safePayload } = payload;

  const user = await usersRepo.create({
    ...safePayload,
    employee_code: employeeCode,
    auth_id: authData.user.id,
  });

  return user;
};

const update = async (id, payload) => {
  await usersRepo.findById(id); // throws 404 if not found
  const { password: _pw, ...safePayload } = payload;
  return usersRepo.update(id, safePayload);
};

const deactivate = async (id) => {
  await usersRepo.findById(id); // throws 404 if not found
  return usersRepo.deactivate(id);
};

const directReports = async (managerId) => {
  await usersRepo.findById(managerId); // throws 404 if not found
  return usersRepo.findDirectReports(managerId);
};

const userKpis = async (userId) => {
  await usersRepo.findById(userId); // throws 404 if not found
  return usersRepo.findUserKpis(userId);
};

const hardDelete = async (id) => {
  await usersRepo.findById(id);
  const { data: authRow } = await supabaseAdmin
    .from('users')
    .select('auth_id')
    .eq('id', id)
    .single();
  if (authRow?.auth_id) {
    await supabaseAdmin.auth.admin.deleteUser(authRow.auth_id).catch(() => {});
  }
  await usersRepo.hardDelete(id);
};

module.exports = { list, getById, create, update, deactivate, hardDelete, directReports, userKpis };
