const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const authController = require('./auth.controller');

const router = Router();

router.post('/login',  catchAsync(authController.login));
router.post('/logout', catchAsync(authController.logout));
router.get('/me',      catchAsync(authController.me));

module.exports = router;
