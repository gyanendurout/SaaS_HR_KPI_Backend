const { z } = require('zod');
const service = require('./approvals.service');
const AppError = require('../../utils/AppError');

const requestSchema = z.object({
  kpi_id: z.string().uuid('Invalid KPI id'),
  note:   z.string().max(1000).optional(),
});

const reviewSchema = z.object({
  reviewer_note: z.string().max(1000).optional(),
});

const list = async (req, res) => {
  const { page, limit, status, kpi_id, requested_by } = req.query;
  const result = await service.list({
    page:         page ? Number(page) : undefined,
    limit:        limit ? Number(limit) : undefined,
    status:       status || undefined,
    kpi_id:       kpi_id || undefined,
    requested_by: requested_by || undefined,
  });
  res.json({ success: true, ...result });
};

const getById = async (req, res) => {
  const data = await service.getById(req.params.id);
  res.json({ success: true, data });
};

const request = async (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return next(new AppError('kpi_id required', 400, 'VALIDATION_ERROR'));

  const ip = req.ip;
  const data = await service.request({ ...parsed.data, requested_by: req.user.id }, req.user.id, ip);
  res.status(201).json({ success: true, data });
};

const approve = async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  const reviewer_note = parsed.success ? parsed.data.reviewer_note : undefined;
  const data = await service.approve(req.params.id, { reviewer_note }, req.user.id, req.ip);
  res.json({ success: true, data });
};

const reject = async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  const reviewer_note = parsed.success ? parsed.data.reviewer_note : undefined;
  const data = await service.reject(req.params.id, { reviewer_note }, req.user.id, req.ip);
  res.json({ success: true, data });
};

const pendingCount = async (_req, res) => {
  const count = await service.pendingCount();
  res.json({ success: true, data: { count } });
};

module.exports = { list, getById, request, approve, reject, pendingCount };
