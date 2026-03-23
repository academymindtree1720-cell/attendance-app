const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const { createObjectCsvWriter } = require('csv-writer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// 1. Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM employees");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Add an employee (Admin)
app.post('/api/employees', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await db.query("INSERT INTO employees (name) VALUES ($1) RETURNING id", [name]);
        res.json({ id: result.rows[0].id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Delete an employee (Admin)
app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM employees WHERE id = $1", [id]);
        res.json({ success: true, message: 'Employee deleted!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Mark Time In
app.post('/api/attendance/in', async (req, res) => {
    const { employee_id, date, time_in } = req.body;
    try {
        await db.query("INSERT INTO attendance (employee_id, date, time_in) VALUES ($1, $2, $3)", 
            [employee_id, date, time_in]);
        res.json({ success: true, message: 'Time In marked successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Mark Time Out
app.post('/api/attendance/out', async (req, res) => {
    const { employee_id, date, time_out } = req.body;
    try {
        // Check if the employee has marked 'In' today
        const result = await db.query("SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND time_out IS NULL ORDER BY id DESC LIMIT 1", [employee_id, date]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'No active Time In found for today.' });
        }
        
        const row = result.rows[0];
        await db.query("UPDATE attendance SET time_out = $1 WHERE id = $2", [time_out, row.id]);
        res.json({ success: true, message: 'Time Out marked successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Apply for Leave
app.post('/api/leaves', async (req, res) => {
    const { employee_id, start_date, end_date, reason } = req.body;
    try {
        await db.query("INSERT INTO leaves (employee_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4)", 
            [employee_id, start_date, end_date, reason]);
        res.json({ success: true, message: 'Leave application submitted!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Get all attendance records (Admin)
app.get('/api/attendance', async (req, res) => {
    const query = `
        SELECT a.id, e.name as employee_name, a.date, a.time_in, a.time_out 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        ORDER BY a.date DESC, a.time_in DESC
    `;
    try {
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Delete an attendance record (Admin editable access)
app.delete('/api/attendance/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM attendance WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: 'Record deleted!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Get all leaves (Admin)
app.get('/api/leaves/all', async (req, res) => {
    const query = `
        SELECT l.id, e.name as employee_name, l.start_date, l.end_date, l.reason, l.status 
        FROM leaves l
        JOIN employees e ON l.employee_id = e.id
        ORDER BY l.start_date DESC
    `;
    try {
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Update Leave Status (Admin)
app.put('/api/leaves/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query("UPDATE leaves SET status = $1 WHERE id = $2", [status, req.params.id]);
        res.json({ success: true, message: 'Leave status updated!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. Export to CSV (Admin)
app.get('/api/export', async (req, res) => {
    const query = `
        SELECT e.name as EmployeeName, a.date as Date, a.time_in as TimeIn, a.time_out as TimeOut 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        ORDER BY a.date DESC
    `;
    try {
        const result = await db.query(query);
        const rows = result.rows;
        
        // Note: For Vercel Serverless, writing to /tmp is required as the filesystem is read-only
        const filePath = path.join('/tmp', 'Attendance_Export.csv');
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                {id: 'EmployeeName', title: 'EMPLOYEE NAME'},
                {id: 'Date', title: 'DATE'},
                {id: 'TimeIn', title: 'TIME IN'},
                {id: 'TimeOut', title: 'TIME OUT'}
            ]
        });

        await csvWriter.writeRecords(rows);
        res.download(filePath, 'Attendance_Export.csv', (err) => {
            if (err) console.error("Error downloading file:", err);
        });
    } catch (err) {
        res.status(500).json({ error: "Could not write export file." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
