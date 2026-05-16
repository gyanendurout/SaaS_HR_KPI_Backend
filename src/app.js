const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const kpisRouter = require('./modules/kpis/kpis.router');
const cascadeRouter = require('./modules/cascade/cascade.router');
const regionsRouter = require('./modules/regions/regions.router');
const approvalsRouter = require('./modules/approvals/approvals.router');
const notificationsRouter = require('./modules/notifications/notifications.router');
const auditRouter = require('./modules/audit/audit.router');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth middleware (applied once at app level for all /api routes) ───────────
const auth = require('./middleware/auth');
app.use('/api/users',         auth);
app.use('/api/kpis',          auth);
app.use('/api/regions',       auth);
app.use('/api/approvals',     auth);
app.use('/api/notifications', auth);
app.use('/api/audit',         auth);
app.use('/api/auth/logout',   auth);
app.use('/api/auth/me',       auth);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/kpis',          kpisRouter);
app.use('/api/kpis',          cascadeRouter);   // /api/kpis/:id/cascade and /api/kpis/:id/contributors
app.use('/api/regions',       regionsRouter);
app.use('/api/approvals',     approvalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit',         auditRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
