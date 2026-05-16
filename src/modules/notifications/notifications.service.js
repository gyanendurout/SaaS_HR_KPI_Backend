const repo = require('./notifications.repository');

const list = (userId, params) => repo.findForUser(userId, params);

const unreadCount = (userId) => repo.countUnread(userId);

const markRead = (id, userId) => repo.markRead(id, userId);

const markAllRead = (userId) => repo.markAllRead(userId);

module.exports = { list, unreadCount, markRead, markAllRead };
