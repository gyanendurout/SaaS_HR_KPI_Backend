const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const ctrl = require('./templates.controller');

const router = Router();

router.get('/',    catchAsync(ctrl.list));
router.post('/',   catchAsync(ctrl.create));
router.get('/:id', catchAsync(ctrl.getById));
router.put('/:id', catchAsync(ctrl.update));
router.delete('/:id', catchAsync(ctrl.remove));

module.exports = router;
