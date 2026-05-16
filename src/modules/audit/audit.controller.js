const service = require('./audit.service');
const AppError = require('../../utils/AppError');

const list = async (req, res, next) => {
  if (!req.user.is_admin) return next(new AppError('Admin only', 403, 'FORBIDDEN'));
  const { page, limit, entity_type, actor_id, action } = req.query;
  const result = await service.list({
    page:        page ? Number(page) : undefined,
    limit:       limit ? Number(limit) : undefined,
    entity_type: entity_type || undefined,
    actor_id:    actor_id || undefined,
    action:      action || undefined,
  });
  res.json({ success: true, ...result });
};

module.exports = { list };
