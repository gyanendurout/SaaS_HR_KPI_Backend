const approvalsRepo = require('./approvals.repository');
const notifsRepo = require('../notifications/notifications.repository');
const auditRepo = require('../audit/audit.repository');
const { supabase } = require('../../config/supabase');
const AppError = require('../../utils/AppError');

const list = (params) => approvalsRepo.findAll(params);

const getById = (id) => approvalsRepo.findById(id);

const request = async ({ kpi_id, requested_by, note }, actorId, ip) => {
  // Check no open pending approval for this KPI
  const existing = await approvalsRepo.findByKpiId(kpi_id);
  const hasPending = existing.some((a) => a.status === 'pending');
  if (hasPending) throw new AppError('KPI already has a pending approval', 409, 'DUPLICATE_APPROVAL');

  // Set kpi approval_status = 'pending'
  await supabase.from('kpis').update({ approval_status: 'pending' }).eq('id', kpi_id);

  const approval = await approvalsRepo.create({ kpi_id, requested_by, note });

  // Notify all admins
  const { data: admins } = await supabase.from('users').select('id').eq('is_admin', true).eq('status', 'active');
  for (const admin of admins ?? []) {
    await notifsRepo.create({
      user_id: admin.id,
      type: 'approval_requested',
      title: 'KPI Approval Requested',
      body: note ?? 'A KPI has been submitted for approval.',
      link_type: 'approval',
      link_id: approval.id,
    });
  }

  await auditRepo.log({ actor_id: actorId, action: 'approval.requested', entity_type: 'approval', entity_id: approval.id, ip_address: ip });

  return approval;
};

const approve = async (id, { reviewer_note }, reviewerId, ip) => {
  const approval = await approvalsRepo.findById(id);
  if (approval.status !== 'pending') throw new AppError('Approval is not pending', 409, 'INVALID_STATE');

  const updated = await approvalsRepo.updateStatus(id, { status: 'approved', reviewed_by: reviewerId, reviewer_note });

  await supabase.from('kpis').update({ approval_status: 'approved', status: 'active' }).eq('id', approval.kpi_id);

  await notifsRepo.create({
    user_id: approval.requested_by,
    type: 'approval_approved',
    title: 'KPI Approved',
    body: reviewer_note ?? 'Your KPI has been approved and is now active.',
    link_type: 'kpi',
    link_id: approval.kpi_id,
  });

  await auditRepo.log({ actor_id: reviewerId, action: 'approval.approved', entity_type: 'approval', entity_id: id, ip_address: ip });

  return updated;
};

const reject = async (id, { reviewer_note }, reviewerId, ip) => {
  const approval = await approvalsRepo.findById(id);
  if (approval.status !== 'pending') throw new AppError('Approval is not pending', 409, 'INVALID_STATE');

  const updated = await approvalsRepo.updateStatus(id, { status: 'rejected', reviewed_by: reviewerId, reviewer_note });

  await supabase.from('kpis').update({ approval_status: 'rejected' }).eq('id', approval.kpi_id);

  await notifsRepo.create({
    user_id: approval.requested_by,
    type: 'approval_rejected',
    title: 'KPI Rejected',
    body: reviewer_note ?? 'Your KPI was not approved.',
    link_type: 'kpi',
    link_id: approval.kpi_id,
  });

  await auditRepo.log({ actor_id: reviewerId, action: 'approval.rejected', entity_type: 'approval', entity_id: id, ip_address: ip });

  return updated;
};

const pendingCount = () => approvalsRepo.countPending();

module.exports = { list, getById, request, approve, reject, pendingCount };
