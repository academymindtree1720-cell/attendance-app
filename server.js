const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');
const { initDB, getDB } = require('./database');
const { initSheets, syncAttendance, syncEmployees, syncLeaves } = require('./sheets');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'panavelystories-attendance-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin access required' });
}

// Helper: trigger Google Sheets sync in background
async function triggerAttendanceSync() {
  try {
    const db = getDB();
    const records = await db.collection('attendance').aggregate([
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { date: 1, check_in: 1, check_out: 1, status: 1, notes: 1, full_name: '$user.full_name', department: '$user.department' } },
      { $sort: { date: -1 } }
    ]).toArray();
    syncAttendance(records);
  } catch {}
}

async function triggerEmployeeSync() {
  try {
    const db = getDB();
    const employees = await db.collection('users').find({}, { projection: { password: 0 } }).sort({ full_name: 1 }).toArray();
    syncEmployees(employees);
  } catch {}
}

async function triggerLeaveSync() {
  try {
    const db = getDB();
    const leaves = await db.collection('leaves').aggregate([
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { leave_type: 1, start_date: 1, end_date: 1, reason: 1, status: 1, admin_remarks: 1, full_name: '$user.full_name', department: '$user.department' } },
      { $sort: { created_at: -1 } }
    ]).toArray();
    syncLeaves(leaves);
  } catch {}
}

// ==================== AUTH ROUTES ====================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDB();
    const user = await db.collection('users').findOne({ username, password, status: 'active' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials or account inactive' });
    req.session.user = { id: user._id.toString(), username: user.username, full_name: user.full_name, role: user.role };
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ==================== EMPLOYEE ROUTES ====================

app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const employees = await db.collection('users').find({}, { projection: { password: 0 } }).sort({ full_name: 1 }).toArray();
    // Map _id to id for frontend compatibility
    res.json(employees.map(e => ({ ...e, id: e._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, email, phone, department, role } = req.body;
    const db = getDB();

    const existing = await db.collection('users').findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const result = await db.collection('users').insertOne({
      username,
      password: password || 'password123',
      full_name,
      email: email || '',
      phone: phone || '',
      department: department || 'General',
      role: role || 'employee',
      status: 'active',
      created_at: new Date()
    });

    triggerEmployeeSync();
    res.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', requireAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, department, role, status, password } = req.body;
    const db = getDB();
    const update = { full_name, email, phone, department, role, status };
    if (password) update.password = password;

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );

    triggerEmployeeSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const oid = new ObjectId(req.params.id);
    await db.collection('attendance').deleteMany({ user_id: oid });
    await db.collection('leaves').deleteMany({ user_id: oid });
    await db.collection('users').deleteOne({ _id: oid });

    triggerEmployeeSync();
    triggerAttendanceSync();
    triggerLeaveSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ATTENDANCE ROUTES ====================

app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const { date, user_id, start_date, end_date } = req.query;
    const db = getDB();
    const filter = {};

    if (req.session.user.role !== 'admin') {
      filter.user_id = new ObjectId(req.session.user.id);
    } else if (user_id) {
      filter.user_id = new ObjectId(user_id);
    }

    if (date) {
      filter.date = date;
    } else if (start_date && end_date) {
      filter.date = { $gte: start_date, $lte: end_date };
    }

    const records = await db.collection('attendance').aggregate([
      { $match: filter },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: {
        id: { $toString: '$_id' }, date: 1, check_in: 1, check_out: 1, status: 1, notes: 1,
        full_name: '$user.full_name', department: '$user.department', user_id: { $toString: '$user_id' }
      }},
      { $sort: { date: -1, check_in: -1 } }
    ]).toArray();

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/checkin', requireAuth, async (req, res) => {
  try {
    const userId = new ObjectId(req.session.user.id);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
    const db = getDB();

    const existing = await db.collection('attendance').findOne({ user_id: userId, date: today });
    if (existing) return res.status(400).json({ error: 'Already checked in today' });

    const parts = now.split(':');
    const hour = parseInt(parts[0]);
    const min = parseInt(parts[1]);
    const status = (hour > 9 || (hour === 9 && min > 30)) ? 'late' : 'present';

    await db.collection('attendance').insertOne({
      user_id: userId, date: today, check_in: now, check_out: null, status, notes: '', created_at: new Date()
    });

    triggerAttendanceSync();
    res.json({ success: true, time: now, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/checkout', requireAuth, async (req, res) => {
  try {
    const userId = new ObjectId(req.session.user.id);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const now = new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
    const db = getDB();

    const existing = await db.collection('attendance').findOne({ user_id: userId, date: today });
    if (!existing) return res.status(400).json({ error: 'Not checked in today' });
    if (existing.check_out) return res.status(400).json({ error: 'Already checked out today' });

    await db.collection('attendance').updateOne({ _id: existing._id }, { $set: { check_out: now } });

    triggerAttendanceSync();
    res.json({ success: true, time: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/attendance/:id', requireAdmin, async (req, res) => {
  try {
    const { check_in, check_out, status, notes } = req.body;
    const db = getDB();
    await db.collection('attendance').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { check_in, check_out, status, notes } }
    );
    triggerAttendanceSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attendance/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    await db.collection('attendance').deleteOne({ _id: new ObjectId(req.params.id) });
    triggerAttendanceSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LEAVE ROUTES ====================

app.get('/api/leaves', requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const filter = {};
    if (req.session.user.role !== 'admin') {
      filter.user_id = new ObjectId(req.session.user.id);
    }

    const leaves = await db.collection('leaves').aggregate([
      { $match: filter },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: {
        id: { $toString: '$_id' }, leave_type: 1, start_date: 1, end_date: 1, reason: 1, status: 1, admin_remarks: 1,
        full_name: '$user.full_name', department: '$user.department', user_id: { $toString: '$user_id' }, created_at: 1
      }},
      { $sort: { created_at: -1 } }
    ]).toArray();

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', requireAuth, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    const db = getDB();
    await db.collection('leaves').insertOne({
      user_id: new ObjectId(req.session.user.id),
      leave_type, start_date, end_date, reason: reason || '',
      status: 'pending', admin_remarks: '', created_at: new Date()
    });
    triggerLeaveSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leaves/:id', requireAdmin, async (req, res) => {
  try {
    const { status, admin_remarks } = req.body;
    const db = getDB();
    await db.collection('leaves').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, admin_remarks } }
    );
    triggerLeaveSync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPORT ROUTES ====================

app.get('/api/export/excel', requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    const db = getDB();
    const filter = {};

    if (user_id) filter.user_id = new ObjectId(user_id);
    if (start_date && end_date) filter.date = { $gte: start_date, $lte: end_date };

    const data = await db.collection('attendance').aggregate([
      { $match: filter },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: {
        Date: '$date', 'Employee Name': '$user.full_name', Department: '$user.department',
        'Check In': '$check_in', 'Check Out': '$check_out', Status: '$status', Notes: '$notes'
      }},
      { $sort: { Date: -1, 'Employee Name': 1 } }
    ]).toArray();

    // Remove _id from output
    const cleanData = data.map(({ _id, ...rest }) => rest);

    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const db = getDB();

    const totalEmployees = await db.collection('users').countDocuments({ role: 'employee', status: 'active' });
    const presentToday = await db.collection('attendance').countDocuments({ date: today });
    const onLeave = await db.collection('leaves').countDocuments({ status: 'approved', start_date: { $lte: today }, end_date: { $gte: today } });
    const pendingLeaves = await db.collection('leaves').countDocuments({ status: 'pending' });
    const lateToday = await db.collection('attendance').countDocuments({ date: today, status: 'late' });

    res.json({ totalEmployees, presentToday, onLeave, pendingLeaves, lateToday, absent: totalEmployees - presentToday - onLeave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server after DB + Sheets init
async function start() {
  await initDB();
  await initSheets();
  app.listen(PORT, () => {
    console.log(`\n🚀 Panavelystories Attendance App running at http://localhost:${PORT}\n`);
    console.log(`   Admin login: admin / admin123\n`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
