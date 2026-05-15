const regionsRepo = require('./regions.repository');

const list = async (_req, res) => {
  const data = await regionsRepo.findAll();
  res.json({ success: true, data });
};

const getById = async (req, res) => {
  const data = await regionsRepo.findById(req.params.id);
  res.json({ success: true, data });
};

module.exports = { list, getById };
