const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const regionsController = require('./regions.controller');

const router = Router();

router.get('/',    catchAsync(regionsController.list));
router.get('/:id', catchAsync(regionsController.getById));

module.exports = router;
