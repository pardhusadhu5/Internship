const express = require('express');
const path = require('path');
const multer = require('multer');
const { db, logAudit, notify } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireRole('reporter'));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype)),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function paginate(items, page, limit) {
  const p = Number(page);
  const l = Number(limit);
  const start = (p - 1) * l;
  return { data: items.slice(start, start + l), total: items.length, page: p, limit: l };
}

router.get('/dashboard', (req, res) => {
  const id = req.user.id;
  res.json({
    assignedTasks: db.assignments.filter(a => a.reporter_id === id).length,
    pendingAssignments: db.assignments.filter(a => a.reporter_id === id && ['Assigned', 'In Progress'].includes(a.status)).length,
    advanceReceived: db.advance_requests.filter(a => a.reporter_id === id && a.status === 'Approved').reduce((s, a) => s + a.amount, 0),
    pendingExpenseSubmission: db.assignments.filter(a => a.reporter_id === id && a.status === 'Completed' && !db.expenses.some(e => e.assignment_id === a.id)).length,
    submittedExpenses: db.expenses.filter(e => e.reporter_id === id).length,
    settlementPending: db.settlements.filter(s => s.reporter_id === id && s.settlement_status !== 'Settled').length,
  });
});

router.get('/assignments', (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  let items = db.assignments.filter(a => a.reporter_id === req.user.id);
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(a => a.title.toLowerCase().includes(s) || a.location.toLowerCase().includes(s));
  }
  if (status) items = items.filter(a => a.status === status);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.put('/assignments/:id/accept', (req, res) => {
  const assignment = db.assignments.find(a => a.id === Number(req.params.id) && a.reporter_id === req.user.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.status !== 'Assigned') return res.status(400).json({ error: 'Cannot accept this assignment' });
  assignment.status = 'In Progress';
  db.save();
  logAudit(req.user.id, `Reporter accepted Assignment #${req.params.id}`, 'Assigned', 'In Progress');
  db.users.filter(u => u.role === 'admin').forEach(a => notify(a.id, 'Assignment Accepted', `${req.user.name} accepted ${assignment.title}`));
  res.json({ message: 'Assignment accepted' });
});

router.put('/assignments/:id/complete', (req, res) => {
  const assignment = db.assignments.find(a => a.id === Number(req.params.id) && a.reporter_id === req.user.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  assignment.status = 'Completed';
  db.save();
  logAudit(req.user.id, `Reporter completed Assignment #${req.params.id}`, assignment.status, 'Completed');
  res.json({ message: 'Assignment marked completed' });
});

router.get('/assignments/list', (req, res) => {
  res.json(db.assignments.filter(a => a.reporter_id === req.user.id && a.status !== 'Cancelled').map(({ id, title }) => ({ id, title })));
});

router.get('/advances', (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  let items = db.advance_requests.filter(a => a.reporter_id === req.user.id).map(ar => ({
    ...ar, assignment_title: db.assignments.find(a => a.id === ar.assignment_id)?.title || '—',
  }));
  if (status) items = items.filter(a => a.status === status);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.post('/advances', (req, res) => {
  const { assignment_id, amount, purpose } = req.body;
  if (!assignment_id || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid request' });
  const assignment = db.assignments.find(a => a.id === assignment_id && a.reporter_id === req.user.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  const id = db.nextId('advance_requests');
  db.advance_requests.push({ id, reporter_id: req.user.id, assignment_id, amount, purpose, status: 'Pending', date: db.today(), created_at: db.now() });
  db.save();
  logAudit(req.user.id, `Reporter requested Advance #${id}`, null, `₹${amount}`);
  db.users.filter(u => u.role === 'admin').forEach(a => notify(a.id, 'New Advance Request', `${req.user.name} requested ₹${amount} for ${assignment.title}`));
  res.json({ id, message: 'Advance request submitted' });
});

router.get('/expenses', (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  let items = db.expenses.filter(e => e.reporter_id === req.user.id).map(e => ({
    ...e, assignment_title: db.assignments.find(a => a.id === e.assignment_id)?.title || '—',
  }));
  if (status) items = items.filter(e => e.status === status);
  if (category) items = items.filter(e => e.category === category);
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(paginate(items, page, limit));
});

router.post('/expenses', upload.single('receipt'), (req, res) => {
  const { assignment_id, category, amount, expense_date, description } = req.body;
  const amt = parseFloat(amount);
  if (!assignment_id || !category || !amt || amt <= 0 || !expense_date) return res.status(400).json({ error: 'Invalid expense data' });

  const assignment = db.assignments.find(a => a.id === Number(assignment_id) && a.reporter_id === req.user.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const receiptLimit = parseFloat(db.settings.receipt_limit || 500);
  if (amt > receiptLimit && !req.file) return res.status(400).json({ error: `Receipt required for expenses above ₹${receiptLimit}` });

  const receipt = req.file ? `/uploads/${req.file.filename}` : null;
  const id = db.nextId('expenses');
  db.expenses.push({ id, assignment_id: Number(assignment_id), reporter_id: req.user.id, category, amount: amt, expense_date, description, receipt, status: 'Pending', remarks: null, created_at: db.now() });
  db.save();
  logAudit(req.user.id, `Reporter submitted Expense #${id}`, null, `${category} ₹${amt}`);
  if (receipt) logAudit(req.user.id, `Reporter uploaded Receipt for Expense #${id}`);
  db.users.filter(u => u.role === 'admin').forEach(a => notify(a.id, 'New Expense Submitted', `${req.user.name} submitted ${category} expense of ₹${amt}`));
  res.json({ id, message: 'Expense submitted' });
});

router.get('/settlements', (req, res) => {
  res.json(db.settlements.filter(s => s.reporter_id === req.user.id).map(s => ({
    ...s, assignment_title: db.assignments.find(a => a.id === s.assignment_id)?.title || '—',
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

module.exports = router;
