const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const cascadeController = require('./cascade.controller');

const router = Router();

// Cascade routes
router.post('/:id/cascade',              catchAsync(cascadeController.createChild));
router.get('/:id/cascade',               catchAsync(cascadeController.getCascade));
router.delete('/:id/cascade/:childId',   catchAsync(cascadeController.removeChild));
router.put('/:id/cascade/:childId',      catchAsync(cascadeController.linkChild));

// Contributor routes (co-located here since they touch KPIs)
router.post('/:id/contributors',                   catchAsync(cascadeController.addContributor));
router.delete('/:id/contributors/:userId',         catchAsync(cascadeController.removeContributor));

module.exports = router;
