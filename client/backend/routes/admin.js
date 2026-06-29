const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, logAudit, notify, recalculateSettlement } = require('../dbConfig');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  try {
    const [reportersRes, activeAssignmentsRes, advancesRes, pendingExpensesRes, settlementsRes, totalExpensesRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'reporter' AND active = 1"),
      pool.query("SELECT COUNT(*) FROM assignments WHERE status IN ('Assigned', 'In Progress')"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM advance_requests WHERE status = 'Approved'"),
      pool.query("SELECT COUNT(*) FROM expenses WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) FROM settlements WHERE settlement_status != 'Settled'"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'Approved'")
    ]);

    res.json({
      totalReporters: parseInt(reportersRes.rows[0].count),
      activeAssignments: parseInt(activeAssignmentsRes.rows[0].count),
      advancesIssued: parseFloat(advancesRes.rows[0].total),
      pendingExpenses: parseInt(pendingExpensesRes.rows[0].count),
      settlementsPending: parseInt(settlementsRes.rows[0].count),
      totalExpenseAmount: parseFloat(totalExpensesRes.rows[0].total)
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
  
  let query = `
    SELECT a.*, u.name as reporter_name 
    FROM assignments a
    LEFT JOIN users u ON a.reporter_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (a.title ILIKE $${params.length} OR a.location ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
  }
  if (status) {
    params.push(status);
    query += ` AND a.status = $${params.length}`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/assignments', async (req, res) => {
  const { reporter_id, title, location, start_date, end_date, priority, description, status } = req.body;
  
  if (start_date && end_date) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (start_date < todayStr) return res.status(400).json({ error: 'Start date cannot be in the past.' });
    if (end_date < start_date) return res.status(400).json({ error: 'End date must be after or equal to the start date.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO assignments (reporter_id, title, location, start_date, end_date, priority, description, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [reporter_id, title, location, start_date, end_date, priority || 'Medium', description, status || 'Assigned']
    );
    const id = rows[0].id;
    
    // Automatically create a blank settlement record for the new assignment
    await pool.query(
      `INSERT INTO settlements (reporter_id, assignment_id, advance_amount, expense_amount, balance, settlement_status) 
       VALUES ($1, $2, 0, 0, 0, 'Pending')`,
      [reporter_id, id]
    );

    await logAudit(req.user.id, `Admin created Assignment #${id}`, null, title);
    await notify(reporter_id, 'New Assignment', `You have been assigned: ${title}`);
    res.json({ id, message: 'Assignment created' });
  } catch (err) {
    console.error('Database Error in Create Assignment:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { reporter_id, title, location, start_date, end_date, priority, description, status } = req.body;
  
  if (start_date && end_date) {
    if (end_date < start_date) return res.status(400).json({ error: 'End date must be after or equal to the start date.' });
  }

  try {
    const oldRes = await pool.query('SELECT status FROM assignments WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    await pool.query(
      `UPDATE assignments SET reporter_id = $1, title = $2, location = $3, start_date = $4, end_date = $5, priority = $6, description = $7, status = $8 WHERE id = $9`,
      [reporter_id, title, location, start_date, end_date, priority, description, status, id]
    );
    
    await logAudit(req.user.id, `Admin updated Assignment #${id}`, oldRes.rows[0].status, status);
    res.json({ message: 'Assignment updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/assignments/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    
    await logAudit(req.user.id, `Admin deleted Assignment #${req.params.id}`);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reporters', async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `SELECT id, name, email, active, created_at FROM users WHERE role = 'reporter'`;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
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

router.get('/reporters/all', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email FROM users WHERE role = 'reporter' AND active = 1");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reporters', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  
  try {
    const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });
    
    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, active) VALUES ($1, $2, $3, 'reporter', 1) RETURNING id`,
      [name, email, hash]
    );
    
    await logAudit(req.user.id, `Admin added Reporter ${name}`, null, email);
    res.json({ id: rows[0].id, message: 'Reporter added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/reporters/:id', async (req, res) => {
  const { name, email, active } = req.body;
  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET name = $1, email = $2, active = $3 WHERE id = $4 AND role = 'reporter'",
      [name, email, active ? 1 : 0, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    
    await logAudit(req.user.id, `Admin updated Reporter #${req.params.id}`);
    res.json({ message: 'Reporter updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reporters/:id/reset-password', async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.password || 'reporter123', 10);
    const { rowCount } = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    
    await logAudit(req.user.id, `Admin reset password for Reporter #${req.params.id}`);
    res.json({ message: 'Password reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/advances', async (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT ar.*, u.name as reporter_name, a.title as assignment_title
    FROM advance_requests ar
    LEFT JOIN users u ON ar.reporter_id = u.id
    LEFT JOIN assignments a ON ar.assignment_id = a.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.name ILIKE $${params.length} OR a.title ILIKE $${params.length})`;
  }
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

router.put('/advances/:id/status', async (req, res) => {
  try {
    const advRes = await pool.query('SELECT status, reporter_id, assignment_id, amount FROM advance_requests WHERE id = $1', [req.params.id]);
    if (advRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const advance = advRes.rows[0];
    const oldStatus = advance.status;
    const newStatus = req.body.status;
    
    await pool.query('UPDATE advance_requests SET status = $1 WHERE id = $2', [newStatus, req.params.id]);
    await logAudit(req.user.id, `Admin ${newStatus.toLowerCase()} Advance Request #${req.params.id}`, oldStatus, newStatus);
    
    if (newStatus === 'Approved') {
      await recalculateSettlement(advance.reporter_id, advance.assignment_id);
      await notify(advance.reporter_id, 'Advance Approved', `Your advance request of ₹${advance.amount} has been approved`);
    } else if (newStatus === 'Rejected') {
      await notify(advance.reporter_id, 'Advance Rejected', `Your advance request of ₹${advance.amount} was rejected`);
    }
    res.json({ message: `Advance ${newStatus.toLowerCase()}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/expenses', async (req, res) => {
  const { search, status, category, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT e.*, u.name as reporter_name, a.title as assignment_title
    FROM expenses e
    LEFT JOIN users u ON e.reporter_id = u.id
    LEFT JOIN assignments a ON e.assignment_id = a.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.name ILIKE $${params.length} OR a.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
  }
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

router.put('/expenses/:id/status', async (req, res) => {
  try {
    const expRes = await pool.query('SELECT status, reporter_id, assignment_id, amount, category FROM expenses WHERE id = $1', [req.params.id]);
    if (expRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const expense = expRes.rows[0];
    const oldStatus = expense.status;
    const newStatus = req.body.status;
    
    await pool.query('UPDATE expenses SET status = $1, remarks = $2 WHERE id = $3', [newStatus, req.body.remarks || null, req.params.id]);
    
    await logAudit(req.user.id, `Admin ${newStatus.toLowerCase()} Expense #${req.params.id}`, oldStatus, newStatus);
    await recalculateSettlement(expense.reporter_id, expense.assignment_id);
    await notify(expense.reporter_id, `Expense ${newStatus}`, `Your expense of ₹${expense.amount} (${expense.category}) was ${newStatus.toLowerCase()}`);
    
    res.json({ message: `Expense ${newStatus.toLowerCase()}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settlements', async (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT s.*, u.name as reporter_name, a.title as assignment_title
    FROM settlements s
    LEFT JOIN users u ON s.reporter_id = u.id
    LEFT JOIN assignments a ON s.assignment_id = a.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.name ILIKE $${params.length} OR a.title ILIKE $${params.length})`;
  }
  if (status) {
    params.push(status);
    query += ` AND s.settlement_status = $${params.length}`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settlements/:id', async (req, res) => {
  try {
    const settRes = await pool.query('SELECT settlement_status, reporter_id FROM settlements WHERE id = $1', [req.params.id]);
    if (settRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const oldStatus = settRes.rows[0].settlement_status;
    const newStatus = req.body.settlement_status;
    
    await pool.query('UPDATE settlements SET settlement_status = $1 WHERE id = $2', [newStatus, req.params.id]);
    await logAudit(req.user.id, `Admin marked Settlement #${req.params.id} as ${newStatus}`, oldStatus, newStatus);
    await notify(settRes.rows[0].reporter_id, 'Settlement Updated', `Settlement status updated to ${newStatus}`);
    
    res.json({ message: 'Settlement updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const monthlyRes = await pool.query(`
      SELECT TO_CHAR(expense_date, 'YYYY-MM') as month, SUM(amount) as total
      FROM expenses WHERE status = 'Approved'
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    const monthlyExpenses = monthlyRes.rows.reverse();

    const assignmentStatsRes = await pool.query(`
      SELECT status, COUNT(*) as count FROM assignments GROUP BY status
    `);
    const assignmentStats = assignmentStatsRes.rows;

    const reporterExpRes = await pool.query(`
      SELECT u.name, SUM(e.amount) as total
      FROM expenses e JOIN users u ON e.reporter_id = u.id
      WHERE e.status = 'Approved' GROUP BY u.name
    `);
    const reporterExpenses = reporterExpRes.rows;

    const settlementStatsRes = await pool.query(`
      SELECT settlement_status as status, COUNT(*) as count FROM settlements GROUP BY settlement_status
    `);
    const settlementStats = settlementStatsRes.rows;

    const categoryRes = await pool.query(`
      SELECT category, SUM(amount) as total FROM expenses WHERE status = 'Approved' GROUP BY category
    `);
    const categoryBreakdown = categoryRes.rows;

    res.json({ monthlyExpenses, assignmentStats, reporterExpenses, settlementStats, categoryBreakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/audit-logs', async (req, res) => {
  const { search, page = 1, limit = 15 } = req.query;
  const p = Number(page);
  const l = Number(limit);
  const offset = (p - 1) * l;
  
  let query = `
    SELECT a.*, u.name as user_name 
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (a.action ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
  }
  
  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as t`, params);
    query += ` ORDER BY a.timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);
    
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: p, limit: l });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/expenses', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, u.name as reporter, a.title as assignment, e.category, e.amount, e.expense_date, e.description, e.status
      FROM expenses e
      LEFT JOIN users u ON e.reporter_id = u.id
      LEFT JOIN assignments a ON e.assignment_id = a.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/settlements', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, u.name as reporter, a.title as assignment, s.advance_amount, s.expense_amount, s.balance, s.settlement_status
      FROM settlements s
      LEFT JOIN users u ON s.reporter_id = u.id
      LEFT JOIN assignments a ON s.assignment_id = a.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
