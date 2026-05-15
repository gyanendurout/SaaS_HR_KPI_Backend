const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const kpisController = require('./kpis.controller');

const router = Router();

router.get('/',           catchAsync(kpisController.list));
router.post('/',          catchAsync(kpisController.create));
router.get('/:id',        catchAsync(kpisController.getById));
router.put('/:id',        catchAsync(kpisController.update));
router.delete('/:id',     catchAsync(kpisController.cancel));
router.get('/:id/children', catchAsync(kpisController.children));
router.get('/:id/tree',     catchAsync(kpisController.tree));

module.exports = router;
