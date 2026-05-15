const { z } = require('zod');
const usersService = require('./users.service');
const AppError = require('../../utils/AppError');

const createSchema = z.object({
  full_name:   z.string().min(1).max(255),
  email:       z.string().email(),
  password:    z.string().min(8),
  phone:       z.string().max(30).optional(),
  designation: z.string().max(150).optional(),
  department:  z.string().max(100).optional(),
  region_id:   z.string().uuid().optional(),
  manager_id:  z.string().uuid().optional(),
  is_admin:    z.boolean().optional().default(false),
  joined_at:   z.string().optional(),
});

const updateSchema = z.object({
  full_name:   z.string().min(1).max(255).optional(),
  phone:       z.string().max(30).optional(),
  designation: z.string().max(150).optional(),
  department:  z.string().max(100).optional(),
  region_id:   z.string().uuid().optional(),
  manager_id:  z.string().uuid().optional().nullable(),
  is_admin:    z.boolean().optional(),
  joined_at:   z.string().optional(),
});

const list = async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const result = await usersService.list({
    page: Math.max(1, Number(page)),
    limit: Math.min(100, Math.max(1, Number(limit))),
    search,
    status,
  });
  res.json({ success: true, ...result });
};

const getById = async (req, res) => {
  const data = await usersService.getById(req.params.id);
  res.json({ success: true, data });
};

const create = async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await usersService.create(parsed.data);
  res.status(201).json({ success: true, data });
};

const update = async (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }
  const data = await usersService.update(req.params.id, parsed.data);
  res.json({ success: true, data });
};

const deactivate = async (req, res) => {
  const data = await usersService.deactivate(req.params.id);
  res.json({ success: true, data });
};

const directReports = async (req, res) => {
  const data = await usersService.directReports(req.params.id);
  res.json({ success: true, data });
};

const kpis = async (req, res) => {
  const data = await usersService.userKpis(req.params.id);
  res.json({ success: true, data });
};

module.exports = { list, getById, create, update, deactivate, directReports, kpis };
