const express = require('express');
const path = require('path');
const multer = require('multer');
const { pool, logAudit, notify } = require('../dbConfig');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireRole('reporter'));

const storage = multer.diskStorage({
  destination: process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\\s/g, '_')}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/dashboard', async (req, res) => {
  const id = req.user.id;
  try {
    const [assignedRes, pendingRes, advanceRes, expenseRes, settlementRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM assignments WHERE reporter_id = $1", [id]),
      pool.query("SELECT COUNT(*) FROM assignments WHERE reporter_id = $1 AND status IN ('Assigned', 'In Progress')", [id]),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM advance_requests WHERE reporter_id = $1 AND status = 'Approved'", [id]),
      pool.query("SELECT COUNT(*) FROM expenses WHERE reporter_id = $1", [id]),
      pool.query("SELECT COUNT(*) FROM settlements WHERE reporter_id = $1 AND settlement_status != 'Settled'", [id]),
    ]);

    const pendingExpenseSubmissionRes = await pool.query(`
      SELECT COUNT(a.id) FROM assignments a 
      WHERE a.reporter_id = $1 AND a.status = 'Completed' 
      AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.assignment_id = a.id)
    `, [id]);

    res.json({
      assignedTasks: parseInt(assignedRes.rows[0].count),
      pendingAssignments: parseInt(pendingRes.rows[0].count),
      advanceReceived: parseFloat(advanceRes.rows[0].total),
      pendingExpenseSubmission: parseInt(pendingExpenseSubmissionRes.rows[0].count),
      submittedExpenses: parseInt(expenseRes.rows[0].count),
      settlementPending: parseInt(settlementRes.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/assignments', async (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `SELECT * FROM assignments WHERE reporter_id = $1`;
  const params = [req.user.id];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (title ILIKE $${params.length} OR location ILIKE $${params.length})`;
  }
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/assignments/:id/accept', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE assignments SET status = 'In Progress' WHERE id = $1 AND reporter_id = $2 AND status = 'Assigned' RETURNING title",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Cannot accept this assignment or not found' });
    
    await logAudit(req.user.id, `Reporter accepted Assignment #${req.params.id}`, 'Assigned', 'In Progress');
    
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await notify(admin.id, 'Assignment Accepted', `${req.user.name} accepted ${rows[0].title}`);
    }
    
    res.json({ message: 'Assignment accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/assignments/:id/complete', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE assignments SET status = 'Completed' WHERE id = $1 AND reporter_id = $2 RETURNING status",
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    await logAudit(req.user.id, `Reporter completed Assignment #${req.params.id}`, 'In Progress', 'Completed');
    res.json({ message: 'Assignment marked completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/assignments/list', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, title FROM assignments WHERE reporter_id = $1 AND status != 'Cancelled'", [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/advances', async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT ar.*, a.title as assignment_title 
    FROM advance_requests ar 
    LEFT JOIN assignments a ON ar.assignment_id = a.id 
    WHERE ar.reporter_id = $1
  `;
  const params = [req.user.id];
  
  if (status) {
    params.push(status);
    query += ` AND ar.status = $${params.length}`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/advances', async (req, res) => {
  const { assignment_id, amount, purpose } = req.body;
  if (!assignment_id || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid request' });
  
  try {
    const assignRes = await pool.query('SELECT title FROM assignments WHERE id = $1 AND reporter_id = $2', [assignment_id, req.user.id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    
    const { rows } = await pool.query(
      `INSERT INTO advance_requests (reporter_id, assignment_id, amount, purpose, date) VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING id`,
      [req.user.id, assignment_id, amount, purpose]
    );
    const id = rows[0].id;
    
    await logAudit(req.user.id, `Reporter requested Advance #${id}`, null, `₹\${amount}`);
    
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await notify(admin.id, 'New Advance Request', `${req.user.name} requested ₹${amount} for ${assignRes.rows[0].title}`);
    }
    
    res.json({ id, message: 'Advance request submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/expenses', async (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT e.*, a.title as assignment_title 
    FROM expenses e 
    LEFT JOIN assignments a ON e.assignment_id = a.id 
    WHERE e.reporter_id = $1
  `;
  const params = [req.user.id];
  
  if (status) {
    params.push(status);
    query += ` AND e.status = $${params.length}`;
  }
  if (category) {
    params.push(category);
    query += ` AND e.category = $${params.length}`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/expenses', upload.single('receipt'), async (req, res) => {
  const { assignment_id, category, amount, expense_date, description } = req.body;
  const amt = parseFloat(amount);
  if (!assignment_id || !category || !amt || amt <= 0 || !expense_date) return res.status(400).json({ error: 'Invalid expense data' });

  try {
    const assignRes = await pool.query('SELECT title FROM assignments WHERE id = $1 AND reporter_id = $2', [assignment_id, req.user.id]);
    if (assignRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });

    const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'receipt_limit'");
    const receiptLimit = parseFloat(settingsRes.rows.length > 0 ? settingsRes.rows[0].value : 500);
    
    if (amt > receiptLimit && !req.file) return res.status(400).json({ error: `Receipt required for expenses above ₹\${receiptLimit}` });

    const receipt = req.file ? `/uploads/\${req.file.filename}` : null;
    
    const { rows } = await pool.query(
      `INSERT INTO expenses (assignment_id, reporter_id, category, amount, expense_date, description, receipt) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [assignment_id, req.user.id, category, amt, expense_date, description, receipt]
    );
    const id = rows[0].id;
    
    await logAudit(req.user.id, `Reporter submitted Expense #${id}`, null, `\${category} ₹\${amt}`);
    if (receipt) await logAudit(req.user.id, `Reporter uploaded Receipt for Expense #${id}`);
    
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await notify(admin.id, 'New Expense Submitted', `\${req.user.name} submitted \${category} expense of ₹\${amt}`);
    }
    
    res.json({ id, message: 'Expense submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settlements', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, a.title as assignment_title 
      FROM settlements s 
      LEFT JOIN assignments a ON s.assignment_id = a.id 
      WHERE s.reporter_id = $1 
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
