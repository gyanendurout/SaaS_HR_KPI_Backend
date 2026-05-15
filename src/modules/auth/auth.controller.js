const { z } = require('zod');
const authService = require('./auth.service');
const AppError = require('../../utils/AppError');

const loginSchema = z.object({
  email:    z.string().email('Required'),
  password: z.string().min(1, 'Required'),
});

const login = async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError('Required', 400, 'VALIDATION_ERROR'));
  }

  const result = await authService.login(parsed.data.email, parsed.data.password);
  res.json({ success: true, data: result });
};

const logout = async (req, res) => {
  const token = req.headers.authorization.slice(7);
  await authService.logout(token);
  res.json({ success: true, message: 'Logged out successfully' });
};

const me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { login, logout, me };
