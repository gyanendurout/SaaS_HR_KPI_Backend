const cascadeRepo = require('./cascade.repository');
const kpisRepo = require('../kpis/kpis.repository');
const kpisService = require('../kpis/kpis.service');
const AppError = require('../../utils/AppError');

const createChild = async (parentId, payload, createdBy) => {
  // Confirm parent exists
  const parent = await kpisRepo.findById(parentId);

  // Check remaining allocation before DB trigger fires (nicer error message)
  const usedPct = await cascadeRepo.getAllocatedPct(parentId);
  const incoming = Number(payload.allocation_pct || 100);
  if (usedPct + incoming > 100) {
    throw new AppError(
      `Allocation overflow: parent has ${(100 - usedPct).toFixed(2)}% remaining, requested ${incoming}%`,
      409,
      'ALLOCATION_OVERFLOW'
    );
  }

  // Inherit region from parent if not specified
  const childPayload = {
    ...payload,
    parent_id: parentId,
    region_id: payload.region_id || parent.region_id,
  };

  return kpisService.create(childPayload, createdBy);
};

const getCascade = (parentId) => cascadeRepo.getCascade(parentId);

const removeChild = async (parentId, childId) => {
  const child = await kpisRepo.findById(childId);
  if (child.parent_id !== parentId) {
    throw new AppError('KPI is not a child of the specified parent', 400, 'VALIDATION_ERROR');
  }
  await cascadeRepo.cancelKpi(childId);
  return { id: childId, status: 'cancelled' };
};

const addContributor = async (kpiId, userId, role, allocationPct, assignedBy) => {
  await kpisRepo.findById(kpiId); // throws 404 if not found
  return cascadeRepo.upsertContributor(kpiId, userId, role, allocationPct, assignedBy);
};

const removeContributor = async (kpiId, userId) => {
  await kpisRepo.findById(kpiId); // throws 404 if not found
  await cascadeRepo.removeContributor(kpiId, userId);
  return { kpi_id: kpiId, user_id: userId, removed: true };
};

module.exports = { createChild, getCascade, removeChild, addContributor, removeContributor };
