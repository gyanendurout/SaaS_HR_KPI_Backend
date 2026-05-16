const kpisRepo = require('./kpis.repository');
const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const computeNextDueDate = (startDate, frequency) => {
  let base = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(base.getTime())) base = new Date();
  const map = { weekly: 7, monthly: 30, quarterly: 90 };
  const days = map[frequency] || 30;
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
};

const list = (filters) => kpisRepo.findAll(filters);

const getById = (id) => kpisRepo.findById(id);

const create = async (payload, createdBy) => {
  if (!payload.region_id) throw new AppError('region_id is required', 400, 'VALIDATION_ERROR');

  // Need to look up region code to generate KPI number
  const { data: region } = await supabase.from('regions').select('code').eq('id', payload.region_id).single();
  if (!region) throw new AppError('Region not found', 404, 'NOT_FOUND');

  const kpiNumber = await kpisRepo.generateKpiNumber(region.code);
  const nextDueDate = computeNextDueDate(payload.start_date, payload.update_frequency || 'monthly');

  return kpisRepo.create({
    ...payload,
    kpi_number:    kpiNumber,
    next_due_date: nextDueDate,
    created_by:    createdBy,
  });
};

const update = async (id, payload) => {
  const existing = await kpisRepo.findById(id); // throws 404 if not found

  if (payload.update_frequency || payload.start_date) {
    payload.next_due_date = computeNextDueDate(
      payload.start_date || existing.start_date,
      payload.update_frequency || existing.update_frequency
    );
  }

  return kpisRepo.update(id, payload);
};

const cancel = async (id) => {
  await kpisRepo.findById(id); // throws 404 if not found
  return kpisRepo.cancel(id);
};

const children = (id) => kpisRepo.findChildren(id);

const tree = (id) => kpisRepo.findTree(id);

module.exports = { list, getById, create, update, cancel, children, tree };
