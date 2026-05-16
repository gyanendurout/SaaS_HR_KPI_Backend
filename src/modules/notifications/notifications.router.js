const { Router } = require('express');
const catchAsync = require('../../utils/catchAsync');
const ctrl = require('./notifications.controller');

const router = Router();

router.get('/',              catchAsync(ctrl.list));
router.get('/count/unread',  catchAsync(ctrl.unreadCount));
router.put('/read-all',      catchAsync(ctrl.markAllRead));
router.put('/:id/read',      catchAsync(ctrl.markRead));

module.exports = router;
