const service = require('./notifications.service');

const list = async (req, res) => {
  const { page, limit, unread_only } = req.query;
  const result = await service.list(req.user.id, {
    page:        page ? Number(page) : undefined,
    limit:       limit ? Number(limit) : undefined,
    unread_only: unread_only === 'true',
  });
  res.json({ success: true, ...result });
};

const unreadCount = async (req, res) => {
  const count = await service.unreadCount(req.user.id);
  res.json({ success: true, data: { count } });
};

const markRead = async (req, res) => {
  const data = await service.markRead(req.params.id, req.user.id);
  res.json({ success: true, data });
};

const markAllRead = async (req, res) => {
  await service.markAllRead(req.user.id);
  res.json({ success: true });
};

module.exports = { list, unreadCount, markRead, markAllRead };
