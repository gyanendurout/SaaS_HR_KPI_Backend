const repo = require('./templates.repository');
const AppError = require('../../utils/AppError');

const list = async (_req, res) => {
  const data = await repo.findAll();
  res.json({ success: true, data });
};

const getById = async (req, res) => {
  const data = await repo.findById(req.params.id);
  res.json({ success: true, data });
};

const create = async (req, res) => {
  const { name, category, icon, fields } = req.body;
  if (!name?.trim()) throw new AppError('Template name is required', 400, 'VALIDATION_ERROR');
  if (!Array.isArray(fields)) throw new AppError('Fields must be an array', 400, 'VALIDATION_ERROR');
  const data = await repo.create({
    name: name.trim(),
    category: category?.trim() || 'Custom',
    icon: icon?.trim() || '📋',
    fields,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data });
};

const update = async (req, res) => {
  const { name, category, icon, fields } = req.body;
  const patch = {};
  if (name !== undefined)     patch.name     = name.trim();
  if (category !== undefined) patch.category = category.trim() || 'Custom';
  if (icon !== undefined)     patch.icon     = icon.trim() || '📋';
  if (fields !== undefined) {
    if (!Array.isArray(fields)) throw new AppError('Fields must be an array', 400, 'VALIDATION_ERROR');
    patch.fields = fields;
  }
  const data = await repo.update(req.params.id, patch);
  res.json({ success: true, data });
};

const remove = async (req, res) => {
  await repo.remove(req.params.id);
  res.json({ success: true });
};

module.exports = { list, getById, create, update, remove };
