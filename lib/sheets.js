// lib/sheets.js
// Helper functions for reading/writing Google Sheets

import { google } from "googleapis";

// ─── Auth ────────────────────────────────────────────────────────────────────
// Reads credentials from environment variables set in .env.local
function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth;
}

// ─── Sheets client ───────────────────────────────────────────────────────────
async function getSheetsClient() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

// ─── Read a range ────────────────────────────────────────────────────────────
// Returns a 2-D array of cell values, e.g. [["Alice","alice@co.com"], ...]
export async function readRange(sheetName, range) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return res.data.values || [];
}

// ─── Append a row ────────────────────────────────────────────────────────────
// Adds one row to the bottom of the given sheet/range
export async function appendRow(sheetName, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

// ─── Get all employees ───────────────────────────────────────────────────────
// Reads the "Employees" sheet.
// Expected columns: A=Name, B=Email, C=Password (plain-text for demo; hash in production!)
export async function getEmployees() {
  const rows = await readRange("Employees", "A2:C");
  console.log("📄 Employees sheet data:", rows);
  return rows.map(([name, email, password]) => ({ name, email, password }));
}

// ─── Get all attendance records ──────────────────────────────────────────────
// Reads the "Attendance" sheet.
// Expected columns: A=Date, B=Email, C=Name, D=Type, E=Time, F=Note
export async function getAttendanceRecords() {
  const rows = await readRange("Attendance", "A2:F");
  return rows.map(([date, email, name, type, time, note]) => ({
    date,
    email,
    name,
    type,
    time,
    note,
  }));
}

// ─── Save an attendance record ───────────────────────────────────────────────
// type = "clock-in" | "clock-out" | "leave"
export async function saveAttendance({ date, email, name, type, time, note = "" }) {
  await appendRow("Attendance", [date, email, name, type, time, note]);
}

// ─── Add a new employee ──────────────────────────────────────────────────────
export async function addEmployee({ name, email, password }) {
  await appendRow("Employees", [name, email, password]);
}