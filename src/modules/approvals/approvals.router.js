const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const ctrl = require('./approvals.controller');

const router = Router();

router.get('/',                        catchAsync(ctrl.list));
router.get('/count/pending',           catchAsync(ctrl.pendingCount));
router.get('/:id',                     catchAsync(ctrl.getById));
router.post('/',                       catchAsync(ctrl.request));
router.put('/:id/approve',             catchAsync(ctrl.approve));
router.put('/:id/reject',              catchAsync(ctrl.reject));

module.exports = router;
