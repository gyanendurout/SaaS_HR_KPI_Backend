const { Router } = require('express');
const adminOnly = require('../../middleware/adminOnly');
const catchAsync = require('../../utils/catchAsync');
const usersController = require('./users.controller');

const router = Router();

router.get('/',                      catchAsync(usersController.list));
router.post('/',         adminOnly,  catchAsync(usersController.create));
router.get('/:id',                   catchAsync(usersController.getById));
router.put('/:id',       adminOnly,  catchAsync(usersController.update));
router.delete('/:id',    adminOnly,  catchAsync(usersController.deactivate));
router.get('/:id/reports',           catchAsync(usersController.directReports));
router.get('/:id/kpis',              catchAsync(usersController.kpis));

module.exports = router;
