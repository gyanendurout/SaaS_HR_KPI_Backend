const regionsRepo = require('./regions.repository');
const AppError = require('../../utils/AppError');

const list = async (_req, res) => {
  const data = await regionsRepo.findAll();
  res.json({ success: true, data });
};

const getById = async (req, res) => {
  const data = await regionsRepo.findById(req.params.id);
  res.json({ success: true, data });
};

const create = async (req, res) => {
  const { name, code } = req.body;
  if (!name?.trim() || !code?.trim()) throw new AppError('Name and code are required', 400, 'VALIDATION_ERROR');
  const data = await regionsRepo.create({ name: name.trim(), code: code.trim() });
  res.status(201).json({ success: true, data });
};

module.exports = { list, getById, create };
