const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const reporterRoutes = require('./routes/reporter');
const commonRoutes = require('./routes/common');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reporter', reporterRoutes);
app.use('/api', commonRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Namaste Telangana Journalist System API' });
});

app.listen(PORT, () => {
  console.log(`\n  🗞️  Namaste Telangana API running at http://localhost:${PORT}`);
  console.log(`  📋 Demo Login:`);
  console.log(`     Admin:    admin@namaste.com / admin123`);
  console.log(`     Reporter: ravi@namaste.com / reporter123\n`);
});
