const express = require('express');
const bcrypt = require('bcryptjs');
const { db, logAudit, notify, recalculateSettlement, data } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

function paginate(items, page, limit) {
  const p = Number(page);
  const l = Number(limit);
  const start = (p - 1) * l;
  return { data: items.slice(start, start + l), total: items.length, page: p, limit: l };
}

function getUserName(id) {
  return db.users.find(u => u.id === id)?.name || 'Unknown';
}

router.get('/dashboard', (req, res) => {
  res.json({
    totalReporters: db.users.filter(u => u.role === 'reporter' && u.active === 1).length,
    activeAssignments: db.assignments.filter(a => ['Assigned', 'In Progress'].includes(a.status)).length,
    advancesIssued: db.advance_requests.filter(a => a.status === 'Approved').reduce((s, a) => s + a.amount, 0),
    pendingExpenses: db.expenses.filter(e => e.status === 'Pending').length,
    settlementsPending: db.settlements.filter(s => s.settlement_status !== 'Settled').length,
    totalExpenseAmount: db.expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0),
  });
});

router.get('/assignments', (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  let items = db.assignments.map(a => ({ ...a, reporter_name: getUserName(a.reporter_id) }));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(a => a.title.toLowerCase().includes(s) || a.location.toLowerCase().includes(s) || a.reporter_name.toLowerCase().includes(s));
  }
  if (status) items = items.filter(a => a.status === status);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.post('/assignments', (req, res) => {
  const { reporter_id, title, location, start_date, end_date, priority, description, status } = req.body;
  const id = db.nextId('assignments');
  db.assignments.push({ id, reporter_id, title, location, start_date, end_date, priority: priority || 'Medium', description, status: status || 'Assigned', created_at: db.now() });
  db.save();
  logAudit(req.user.id, `Admin created Assignment #${id}`, null, title);
  notify(reporter_id, 'New Assignment', `You have been assigned: ${title}`);
  res.json({ id, message: 'Assignment created' });
});

router.put('/assignments/:id', (req, res) => {
  const old = db.assignments.find(a => a.id === Number(req.params.id));
  if (!old) return res.status(404).json({ error: 'Not found' });
  Object.assign(old, req.body);
  db.save();
  logAudit(req.user.id, `Admin updated Assignment #${req.params.id}`, old.status, req.body.status);
  res.json({ message: 'Assignment updated' });
});

router.delete('/assignments/:id', (req, res) => {
  const idx = db.assignments.findIndex(a => a.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.assignments.splice(idx, 1);
  db.save();
  logAudit(req.user.id, `Admin deleted Assignment #${req.params.id}`);
  res.json({ message: 'Assignment deleted' });
});

router.get('/reporters', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let items = db.users.filter(u => u.role === 'reporter').map(({ password, ...u }) => u);
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }
  res.json(paginate(items, page, limit));
});

router.get('/reporters/all', (req, res) => {
  res.json(db.users.filter(u => u.role === 'reporter' && u.active === 1).map(({ id, name, email }) => ({ id, name, email })));
});

router.post('/reporters', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });
  const id = db.nextId('users');
  db.users.push({ id, name, email, password: bcrypt.hashSync(password, 10), role: 'reporter', active: 1, created_at: db.now() });
  db.save();
  logAudit(req.user.id, `Admin added Reporter ${name}`, null, email);
  res.json({ id, message: 'Reporter added' });
});

router.put('/reporters/:id', (req, res) => {
  const user = db.users.find(u => u.id === Number(req.params.id) && u.role === 'reporter');
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { name, email, active } = req.body;
  user.name = name; user.email = email; user.active = active ? 1 : 0;
  db.save();
  logAudit(req.user.id, `Admin updated Reporter #${req.params.id}`);
  res.json({ message: 'Reporter updated' });
});

router.post('/reporters/:id/reset-password', (req, res) => {
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.password = bcrypt.hashSync(req.body.password || 'reporter123', 10);
  db.save();
  logAudit(req.user.id, `Admin reset password for Reporter #${req.params.id}`);
  res.json({ message: 'Password reset' });
});

router.get('/advances', (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  let items = db.advance_requests.map(ar => ({
    ...ar,
    reporter_name: getUserName(ar.reporter_id),
    assignment_title: db.assignments.find(a => a.id === ar.assignment_id)?.title || '—',
  }));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(a => a.reporter_name.toLowerCase().includes(s) || a.assignment_title.toLowerCase().includes(s));
  }
  if (status) items = items.filter(a => a.status === status);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.put('/advances/:id/status', (req, res) => {
  const advance = db.advance_requests.find(a => a.id === Number(req.params.id));
  if (!advance) return res.status(404).json({ error: 'Not found' });
  const oldStatus = advance.status;
  advance.status = req.body.status;
  db.save();
  logAudit(req.user.id, `Admin ${req.body.status.toLowerCase()} Advance Request #${req.params.id}`, oldStatus, req.body.status);
  if (req.body.status === 'Approved') {
    recalculateSettlement(advance.reporter_id, advance.assignment_id);
    notify(advance.reporter_id, 'Advance Approved', `Your advance request of ₹${advance.amount} has been approved`);
  } else if (req.body.status === 'Rejected') {
    notify(advance.reporter_id, 'Advance Rejected', `Your advance request of ₹${advance.amount} was rejected`);
  }
  res.json({ message: `Advance ${req.body.status.toLowerCase()}` });
});

router.get('/expenses', (req, res) => {
  const { search, status, category, page = 1, limit = 10 } = req.query;
  let items = db.expenses.map(e => ({
    ...e,
    reporter_name: getUserName(e.reporter_id),
    assignment_title: db.assignments.find(a => a.id === e.assignment_id)?.title || '—',
  }));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(e => e.reporter_name.toLowerCase().includes(s) || e.assignment_title.toLowerCase().includes(s) || (e.description || '').toLowerCase().includes(s));
  }
  if (status) items = items.filter(e => e.status === status);
  if (category) items = items.filter(e => e.category === category);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.put('/expenses/:id/status', (req, res) => {
  const expense = db.expenses.find(e => e.id === Number(req.params.id));
  if (!expense) return res.status(404).json({ error: 'Not found' });
  const oldStatus = expense.status;
  expense.status = req.body.status;
  expense.remarks = req.body.remarks || null;
  db.save();
  logAudit(req.user.id, `Admin ${req.body.status.toLowerCase()} Expense #${req.params.id}`, oldStatus, req.body.status);
  recalculateSettlement(expense.reporter_id, expense.assignment_id);
  notify(expense.reporter_id, `Expense ${req.body.status}`, `Your expense of ₹${expense.amount} (${expense.category}) was ${req.body.status.toLowerCase()}`);
  res.json({ message: `Expense ${req.body.status.toLowerCase()}` });
});

router.get('/settlements', (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  let items = db.settlements.map(s => ({
    ...s,
    reporter_name: getUserName(s.reporter_id),
    assignment_title: db.assignments.find(a => a.id === s.assignment_id)?.title || '—',
  }));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(x => x.reporter_name.toLowerCase().includes(s) || x.assignment_title.toLowerCase().includes(s));
  }
  if (status) items = items.filter(s => s.settlement_status === status);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.put('/settlements/:id', (req, res) => {
  const settlement = db.settlements.find(s => s.id === Number(req.params.id));
  if (!settlement) return res.status(404).json({ error: 'Not found' });
  const old = settlement.settlement_status;
  settlement.settlement_status = req.body.settlement_status;
  db.save();
  logAudit(req.user.id, `Admin marked Settlement #${req.params.id} as ${req.body.settlement_status}`, old, req.body.settlement_status);
  notify(settlement.reporter_id, 'Settlement Updated', `Settlement status updated to ${req.body.settlement_status}`);
  res.json({ message: 'Settlement updated' });
});

router.get('/analytics', (req, res) => {
  const monthlyMap = {};
  db.expenses.filter(e => e.status === 'Approved').forEach(e => {
    const month = e.expense_date.slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + e.amount;
  });
  const monthlyExpenses = Object.entries(monthlyMap).sort().slice(-6).map(([month, total]) => ({ month, total }));

  const assignmentStats = ['Assigned', 'In Progress', 'Completed', 'Cancelled'].map(status => ({
    status, count: db.assignments.filter(a => a.status === status).length,
  })).filter(s => s.count > 0);

  const reporterExpenses = db.users.filter(u => u.role === 'reporter').map(u => ({
    name: u.name,
    total: db.expenses.filter(e => e.reporter_id === u.id && e.status === 'Approved').reduce((s, e) => s + e.amount, 0),
  }));

  const settlementStats = ['Pending', 'Verified', 'Settled'].map(status => ({
    status, count: db.settlements.filter(s => s.settlement_status === status).length,
  })).filter(s => s.count > 0);

  const catMap = {};
  db.expenses.filter(e => e.status === 'Approved').forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(catMap).map(([category, total]) => ({ category, total }));

  res.json({ monthlyExpenses, assignmentStats, reporterExpenses, settlementStats, categoryBreakdown });
});

router.get('/audit-logs', (req, res) => {
  const { search, page = 1, limit = 15 } = req.query;
  let items = db.audit_logs.map(al => ({ ...al, user_name: getUserName(al.user_id) }));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(al => al.action.toLowerCase().includes(s) || (al.user_name || '').toLowerCase().includes(s));
  }
  res.json(paginate(items, page, limit));
});

router.get('/export/expenses', (req, res) => {
  res.json(db.expenses.map(e => ({
    id: e.id, reporter: getUserName(e.reporter_id),
    assignment: db.assignments.find(a => a.id === e.assignment_id)?.title,
    category: e.category, amount: e.amount, expense_date: e.expense_date,
    description: e.description, status: e.status,
  })));
});

router.get('/export/settlements', (req, res) => {
  res.json(db.settlements.map(s => ({
    id: s.id, reporter: getUserName(s.reporter_id),
    assignment: db.assignments.find(a => a.id === s.assignment_id)?.title,
    advance_amount: s.advance_amount, expense_amount: s.expense_amount,
    balance: s.balance, settlement_status: s.settlement_status,
  })));
});

module.exports = router;
