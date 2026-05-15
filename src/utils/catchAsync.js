// Wraps async route handlers so thrown errors reach errorHandler middleware
const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

module.exports = catchAsync;
