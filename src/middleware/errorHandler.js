const errorHandler = (err, _req, res, _next) => {
  // Express body-parser and cors errors use err.status, not err.statusCode
  const statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';

  // Normalise specific Express-generated error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
  }
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' } });
  }
  if (message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'CORS policy violation' } });
  }

  // Log unexpected errors (not operational)
  if (!err.isOperational) {
    console.error('[Unhandled Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

module.exports = errorHandler;
