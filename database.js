const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

if (process.env.POSTGRES_URL) {
    // Vercel PostgreSQL setup
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL + "?sslmode=require",
    });

    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack);
        }
        console.log('Connected to PostgreSQL database.');
        
        // Create Employees Table
        client.query(`CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        )`);

        // Create Attendance Table
        client.query(`CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            date VARCHAR(255) NOT NULL,
            time_in VARCHAR(255),
            time_out VARCHAR(255)
        )`);

        // Create Leaves Table
        client.query(`CREATE TABLE IF NOT EXISTS leaves (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            start_date VARCHAR(255) NOT NULL,
            end_date VARCHAR(255) NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'Pending'
        )`);
        
        release();
    });

    db = {
        query: (text, params) => pool.query(text, params)
    };
} else {
    // Local SQLite fallback
    const dbPath = path.resolve(__dirname, 'database.db');
    const sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening local SQLite database', err.message);
        } else {
            console.log('Connected to local SQLite database.');
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )`);
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                date TEXT NOT NULL,
                time_in TEXT,
                time_out TEXT,
                FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )`);
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS leaves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'Pending',
                FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )`);
        }
    });

    db = {
        query: (text, params) => {
            return new Promise((resolve, reject) => {
                // Convert PostgreSQL $1, $2 placeholders to SQLite ? placeholders
                let modifiedText = text.replace(/\$\d+/g, '?');
                
                const isInsert = modifiedText.toUpperCase().includes('INSERT');
                const isSelect = modifiedText.toUpperCase().startsWith('SELECT');

                if (isInsert && modifiedText.toUpperCase().includes('RETURNING ID')) {
                    // SQLite doesn't support RETURNING id in the query string easily.
                    modifiedText = modifiedText.replace(/RETURNING id/i, '');
                    sqliteDb.run(modifiedText, params, function(err) {
                        if (err) reject(err);
                        else resolve({ rows: [{ id: this.lastID }] });
                    });
                } else if (!isSelect) {
                    sqliteDb.run(modifiedText, params, function(err) {
                        if (err) reject(err);
                        else resolve({ rows: [], rowCount: this.changes });
                    });
                } else {
                    sqliteDb.all(modifiedText, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve({ rows: rows });
                    });
                }
            });
        }
    };
}

module.exports = db;
