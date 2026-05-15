const { z } = require('zod');
const kpisService = require('./kpis.service');
const AppError = require('../../utils/AppError');

const createSchema = z.object({
  name:              z.string().min(1).max(255),
  description:       z.string().optional(),
  type:              z.enum(['quantitative', 'qualitative']).default('quantitative'),
  period:            z.enum(['monthly', 'quarterly', 'annual']).default('quarterly'),
  update_frequency:  z.enum(['weekly', 'monthly', 'quarterly']).default('monthly'),
  target_value:      z.number().optional(),
  unit:              z.string().max(50).optional(),
  start_date:        z.string().optional(),
  end_date:          z.string().optional(),
  allocation_pct:    z.number().min(0).max(100).default(100),
  region_id:         z.string().uuid(),
  owner_id:          z.string().uuid().optional(),
  parent_id:         z.string().uuid().optional(),
});

const updateSchema = z.object({
  name:              z.string().min(1).max(255).optional(),
  description:       z.string().optional(),
  type:              z.enum(['quantitative', 'qualitative']).optional(),
  period:            z.enum(['monthly', 'quarterly', 'annual']).optional(),
  update_frequency:  z.enum(['weekly', 'monthly', 'quarterly']).optional(),
  target_value:      z.number().optional(),
  current_value:     z.number().min(0).optional(),
  unit:              z.string().max(50).optional(),
  start_date:        z.string().optional(),
  end_date:          z.string().optional(),
  allocation_pct:    z.number().min(0).max(100).optional(),
  status:            z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  owner_id:          z.string().uuid().optional(),
});

const list = async (req, res) => {
  const { page = 1, limit = 20, status, owner_id, region_id } = req.query;
  const result = await kpisService.list({
    page: Math.max(1, Number(page)),
    limit: Math.min(100, Math.max(1, Number(limit))),
    status,
    owner_id,
    region_id,
  });
  res.json({ success: true, ...result });
};

const getById = async (req, res) => {
  const data = await kpisService.getById(req.params.id);
  res.json({ success: true, data });
};

const create = async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await kpisService.create(parsed.data, req.user.id);
  res.status(201).json({ success: true, data });
};

const update = async (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await kpisService.update(req.params.id, parsed.data);
  res.json({ success: true, data });
};

const cancel = async (req, res) => {
  const data = await kpisService.cancel(req.params.id);
  res.json({ success: true, data });
};

const children = async (req, res) => {
  const data = await kpisService.children(req.params.id);
  res.json({ success: true, data });
};

const tree = async (req, res) => {
  const data = await kpisService.tree(req.params.id);
  res.json({ success: true, data });
};

module.exports = { list, getById, create, update, cancel, children, tree };
