const { z } = require('zod');
const cascadeService = require('./cascade.service');
const AppError = require('../../utils/AppError');

const createChildSchema = z.object({
  name:             z.string().min(1).max(255),
  description:      z.string().optional(),
  type:             z.enum(['quantitative', 'qualitative']).default('quantitative'),
  period:           z.enum(['monthly', 'quarterly', 'annual']).default('quarterly'),
  update_frequency: z.enum(['weekly', 'monthly', 'quarterly']).default('monthly'),
  target_value:     z.number().optional(),
  unit:             z.string().max(50).optional(),
  start_date:       z.string().optional(),
  end_date:         z.string().optional(),
  allocation_pct:   z.number().min(0.01).max(100),
  owner_id:         z.string().uuid().optional(),
  region_id:        z.string().uuid().optional(),
});

const contributorSchema = z.object({
  user_id:        z.string().uuid(),
  role:           z.enum(['owner', 'contributor']).default('contributor'),
  allocation_pct: z.number().min(0).max(100).default(0),
});

const createChild = async (req, res, next) => {
  const parsed = createChildSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await cascadeService.createChild(req.params.id, parsed.data, req.user.id);
  res.status(201).json({ success: true, data });
};

const getCascade = async (req, res) => {
  const data = await cascadeService.getCascade(req.params.id);
  res.json({ success: true, data });
};

const removeChild = async (req, res) => {
  const data = await cascadeService.removeChild(req.params.id, req.params.childId);
  res.json({ success: true, data });
};

const addContributor = async (req, res, next) => {
  const parsed = contributorSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await cascadeService.addContributor(
    req.params.id,
    parsed.data.user_id,
    parsed.data.role,
    parsed.data.allocation_pct,
    req.user.id
  );
  res.status(201).json({ success: true, data });
};

const removeContributor = async (req, res) => {
  const data = await cascadeService.removeContributor(req.params.id, req.params.userId);
  res.json({ success: true, data });
};

module.exports = { createChild, getCascade, removeChild, addContributor, removeContributor };
