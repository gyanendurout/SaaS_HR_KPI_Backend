class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;
  }
}

module.exports = AppError;
