const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const ctrl = require('./audit.controller');

const router = Router();

router.get('/', catchAsync(ctrl.list));

module.exports = router;
