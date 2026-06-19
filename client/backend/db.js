const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbPath = path.join(__dirname, 'database.json');
if (process.env.VERCEL) {
  dbPath = '/tmp/database.json';
  const defaultDbPath = path.join(__dirname, 'database.json');
  if (!fs.existsSync(dbPath) && fs.existsSync(defaultDbPath)) {
    fs.copyFileSync(defaultDbPath, dbPath);
  }
}

const defaultData = {
  users: [],
  assignments: [],
  advance_requests: [],
  expenses: [],
  settlements: [],
  notifications: [],
  audit_logs: [],
  settings: { receipt_limit: '500' },
  _counters: { users: 0, assignments: 0, advance_requests: 0, expenses: 0, settlements: 0, notifications: 0, audit_logs: 0 },
};

let data = load();

function load() {
  if (fs.existsSync(dbPath)) {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  return JSON.parse(JSON.stringify(defaultData));
}

function save() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function nextId(table) {
  data._counters[table] = (data._counters[table] || 0) + 1;
  return data._counters[table];
}

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function seedData() {
  if (data.users.length > 0) return;

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  data.users = [
    { id: 1, name: 'Admin User', email: 'admin@namaste.com', password: hash('admin123'), role: 'admin', active: 1, created_at: now() },
    { id: 2, name: 'Ravi Kumar', email: 'ravi@namaste.com', password: hash('reporter123'), role: 'reporter', active: 1, created_at: now() },
    { id: 3, name: 'Priya Sharma', email: 'priya@namaste.com', password: hash('reporter123'), role: 'reporter', active: 1, created_at: now() },
    { id: 4, name: 'Suresh Reddy', email: 'suresh@namaste.com', password: hash('reporter123'), role: 'reporter', active: 1, created_at: now() },
  ];

  data.assignments = [
    { id: 1, reporter_id: 2, title: 'Election Coverage - Hyderabad', location: 'Hyderabad', start_date: '2026-06-01', end_date: '2026-06-05', priority: 'High', description: 'Cover assembly election proceedings in Hyderabad constituency.', status: 'In Progress', created_at: now() },
    { id: 2, reporter_id: 2, title: 'Farmers Protest Report', location: 'Warangal', start_date: '2026-06-10', end_date: '2026-06-12', priority: 'Medium', description: 'On-ground reporting of farmers protest and interviews.', status: 'Assigned', created_at: now() },
    { id: 3, reporter_id: 3, title: 'Tech Summit Coverage', location: 'Hyderabad', start_date: '2026-06-08', end_date: '2026-06-09', priority: 'High', description: 'Cover IT summit at HITEC City.', status: 'Completed', created_at: now() },
    { id: 4, reporter_id: 4, title: 'Rural Health Camp', location: 'Nizamabad', start_date: '2026-06-15', end_date: '2026-06-17', priority: 'Low', description: 'Report on government health camp in rural areas.', status: 'Assigned', created_at: now() },
  ];

  data.advance_requests = [
    { id: 1, reporter_id: 2, assignment_id: 1, amount: 5000, purpose: 'Travel and accommodation for election coverage', status: 'Approved', date: '2026-06-01', created_at: now() },
    { id: 2, reporter_id: 3, assignment_id: 3, amount: 3000, purpose: 'Transport and food for tech summit', status: 'Approved', date: '2026-06-08', created_at: now() },
    { id: 3, reporter_id: 4, assignment_id: 4, amount: 2000, purpose: 'Travel to Nizamabad', status: 'Pending', date: today(), created_at: now() },
  ];

  data.expenses = [
    { id: 1, assignment_id: 1, reporter_id: 2, category: 'Travel', amount: 1200, expense_date: '2026-06-01', description: 'Train tickets Hyderabad', receipt: null, status: 'Approved', remarks: null, created_at: now() },
    { id: 2, assignment_id: 1, reporter_id: 2, category: 'Food', amount: 450, expense_date: '2026-06-02', description: 'Meals during coverage', receipt: null, status: 'Approved', remarks: null, created_at: now() },
    { id: 3, assignment_id: 1, reporter_id: 2, category: 'Accommodation', amount: 1800, expense_date: '2026-06-01', description: 'Hotel stay 2 nights', receipt: null, status: 'Pending', remarks: null, created_at: now() },
    { id: 4, assignment_id: 3, reporter_id: 3, category: 'Local Transport', amount: 350, expense_date: '2026-06-08', description: 'Auto and cab fares', receipt: null, status: 'Approved', remarks: null, created_at: now() },
  ];

  data.settlements = [
    { id: 1, reporter_id: 2, assignment_id: 1, advance_amount: 5000, expense_amount: 1650, balance: 3350, settlement_status: 'Pending', created_at: now() },
    { id: 2, reporter_id: 3, assignment_id: 3, advance_amount: 3000, expense_amount: 350, balance: 2650, settlement_status: 'Settled', created_at: now() },
  ];

  data.notifications = [
    { id: 1, user_id: 1, title: 'New Advance Request', message: 'Suresh Reddy requested advance of ₹2000', read: 0, created_at: now() },
    { id: 2, user_id: 1, title: 'Expense Submitted', message: 'Ravi Kumar submitted accommodation expense of ₹1800', read: 0, created_at: now() },
    { id: 3, user_id: 2, title: 'New Assignment', message: 'Farmers Protest Report assigned to you', read: 0, created_at: now() },
    { id: 4, user_id: 2, title: 'Advance Approved', message: 'Your advance request of ₹5000 has been approved', read: 0, created_at: now() },
  ];

  data.audit_logs = [
    { id: 1, user_id: 1, action: 'Admin approved Advance Request #1', old_value: 'Pending', new_value: 'Approved', timestamp: now() },
    { id: 2, user_id: 2, action: 'Reporter submitted Expense #3', old_value: null, new_value: 'Accommodation ₹1800', timestamp: now() },
  ];

  data._counters = { users: 4, assignments: 4, advance_requests: 3, expenses: 4, settlements: 2, notifications: 4, audit_logs: 2 };
  save();
}

seedData();

function logAudit(userId, action, oldValue = null, newValue = null) {
  data.audit_logs.unshift({ id: nextId('audit_logs'), user_id: userId, action, old_value: oldValue, new_value: newValue, timestamp: now() });
  save();
}

function notify(userId, title, message) {
  data.notifications.unshift({ id: nextId('notifications'), user_id: userId, title, message, read: 0, created_at: now() });
  save();
}

function recalculateSettlement(reporterId, assignmentId) {
  const advance = data.advance_requests
    .filter(a => a.reporter_id === reporterId && a.assignment_id === assignmentId && a.status === 'Approved')
    .reduce((s, a) => s + a.amount, 0);

  const expenses = data.expenses
    .filter(e => e.reporter_id === reporterId && e.assignment_id === assignmentId && e.status === 'Approved')
    .reduce((s, e) => s + e.amount, 0);

  const balance = advance - expenses;
  const existing = data.settlements.find(s => s.reporter_id === reporterId && s.assignment_id === assignmentId);

  if (existing) {
    existing.advance_amount = advance;
    existing.expense_amount = expenses;
    existing.balance = balance;
  } else if (advance > 0 || expenses > 0) {
    data.settlements.push({
      id: nextId('settlements'), reporter_id: reporterId, assignment_id: assignmentId,
      advance_amount: advance, expense_amount: expenses, balance, settlement_status: 'Pending', created_at: now(),
    });
  }
  save();
}

const db = {
  get users() { return data.users; },
  get assignments() { return data.assignments; },
  get advance_requests() { return data.advance_requests; },
  get expenses() { return data.expenses; },
  get settlements() { return data.settlements; },
  get notifications() { return data.notifications; },
  get audit_logs() { return data.audit_logs; },
  get settings() { return data.settings; },
  save,
  nextId,
  now,
  today,
};

module.exports = { db, logAudit, notify, recalculateSettlement, data };
