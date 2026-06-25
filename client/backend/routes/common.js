const express = require('express');
const { pool } = require('../dbConfig');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/notifications', async (req, res) => {
  try {
    const { rows: notifications } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    const { rows: unreadRes } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = 0',
      [req.user.id]
    );
    res.json({ notifications, unread: parseInt(unreadRes[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settings/receipt-limit', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'receipt_limit'");
    res.json({ receipt_limit: parseFloat(rows.length > 0 ? rows[0].value : 500) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
