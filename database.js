const { Pool } = require('pg');

const db = new Pool({
  // This uses the environment variable provided by Vercel Postgres
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

db.connect((err, client, release) => {
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

module.exports = db;
