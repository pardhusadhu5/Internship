const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/notifications', (req, res) => {
  const notifications = db.notifications.filter(n => n.user_id === req.user.id).slice(0, 20);
  const unread = db.notifications.filter(n => n.user_id === req.user.id && n.read === 0).length;
  res.json({ notifications, unread });
});

router.put('/notifications/:id/read', (req, res) => {
  const n = db.notifications.find(x => x.id === Number(req.params.id) && x.user_id === req.user.id);
  if (n) { n.read = 1; db.save(); }
  res.json({ message: 'Marked as read' });
});

router.put('/notifications/read-all', (req, res) => {
  db.notifications.filter(n => n.user_id === req.user.id).forEach(n => { n.read = 1; });
  db.save();
  res.json({ message: 'All marked as read' });
});

router.get('/settings/receipt-limit', (req, res) => {
  res.json({ receipt_limit: parseFloat(db.settings.receipt_limit || 500) });
});

module.exports = router;
