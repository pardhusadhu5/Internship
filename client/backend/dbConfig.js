const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    
    // Check if we need to seed the default admin
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding initial users...');
      const hash = (pwd) => bcrypt.hashSync(pwd, 10);
      await pool.query(`
        INSERT INTO users (name, email, password, role) VALUES 
        ('Admin User', 'admin@namaste.com', $1, 'admin'),
        ('Ravi Kumar', 'ravi@namaste.com', $2, 'reporter'),
        ('Priya Sharma', 'priya@namaste.com', $2, 'reporter'),
        ('Suresh Reddy', 'suresh@namaste.com', $2, 'reporter')
      `, [hash('admin123'), hash('reporter123')]);
    }
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

async function logAudit(userId, action, oldValue = null, newValue = null) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4)',
      [userId, action, oldValue, newValue]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

async function notify(userId, title, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [userId, title, message]
    );
  } catch (err) {
    console.error('Notification error:', err);
  }
}

async function recalculateSettlement(reporterId, assignmentId) {
  try {
    // Sum approved advances
    const advRes = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM advance_requests WHERE reporter_id = $1 AND assignment_id = $2 AND status = 'Approved'",
      [reporterId, assignmentId]
    );
    const advance = parseFloat(advRes.rows[0].total);

    // Sum approved expenses
    const expRes = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE reporter_id = $1 AND assignment_id = $2 AND status = 'Approved'",
      [reporterId, assignmentId]
    );
    const expenses = parseFloat(expRes.rows[0].total);

    const balance = advance - expenses;

    // Update or insert settlement
    const settRes = await pool.query(
      "SELECT id FROM settlements WHERE reporter_id = $1 AND assignment_id = $2",
      [reporterId, assignmentId]
    );

    if (settRes.rows.length > 0) {
      await pool.query(
        "UPDATE settlements SET advance_amount = $1, expense_amount = $2, balance = $3 WHERE id = $4",
        [advance, expenses, balance, settRes.rows[0].id]
      );
    } else if (advance > 0 || expenses > 0) {
      await pool.query(
        "INSERT INTO settlements (reporter_id, assignment_id, advance_amount, expense_amount, balance) VALUES ($1, $2, $3, $4, $5)",
        [reporterId, assignmentId, advance, expenses, balance]
      );
    }
  } catch (err) {
    console.error('Recalculate settlement error:', err);
  }
}

module.exports = { pool, initDB, logAudit, notify, recalculateSettlement };
