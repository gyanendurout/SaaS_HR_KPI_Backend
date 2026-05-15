const AppError = require('../utils/AppError');

// Must run after auth middleware (req.user is already set)
const adminOnly = (req, _res, next) => {
  if (!req.user?.is_admin) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  next();
};

module.exports = adminOnly;
