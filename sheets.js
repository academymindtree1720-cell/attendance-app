const { google } = require('googleapis');

let sheets = null;
let SHEET_ID = null;
let isConfigured = false;

async function initSheets() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!email || !key || !SHEET_ID) {
      console.log('⚠️  Google Sheets not configured (set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)');
      return;
    }

    const auth = new google.auth.JWT(
      email,
      null,
      key.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheets = google.sheets({ version: 'v4', auth });
    isConfigured = true;

    // Ensure sheets exist
    await ensureSheets();
    console.log('✅ Google Sheets connected');
  } catch (err) {
    console.log('⚠️  Google Sheets setup failed:', err.message);
  }
}

async function ensureSheets() {
  if (!isConfigured) return;
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existing = spreadsheet.data.sheets.map(s => s.properties.title);

    const sheetsToCreate = [];
    if (!existing.includes('Attendance')) sheetsToCreate.push('Attendance');
    if (!existing.includes('Employees')) sheetsToCreate.push('Employees');
    if (!existing.includes('Leave Requests')) sheetsToCreate.push('Leave Requests');

    if (sheetsToCreate.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: sheetsToCreate.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });
    }

    // Set headers if sheets are new
    for (const name of sheetsToCreate) {
      let headers;
      if (name === 'Attendance') {
        headers = ['Date', 'Employee Name', 'Department', 'Check In', 'Check Out', 'Status', 'Notes'];
      } else if (name === 'Employees') {
        headers = ['Name', 'Username', 'Email', 'Phone', 'Department', 'Role', 'Status'];
      } else if (name === 'Leave Requests') {
        headers = ['Employee', 'Department', 'Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Admin Remarks'];
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'${name}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] }
      });
    }
  } catch (err) {
    console.log('⚠️  Sheet setup error:', err.message);
  }
}

// Sync all attendance records to Google Sheets
async function syncAttendance(records) {
  if (!isConfigured) return;
  try {
    // Clear existing data (keep header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: "'Attendance'!A2:G10000"
    });

    if (!records.length) return;

    const rows = records.map(r => [
      r.date, r.full_name, r.department, r.check_in || '', r.check_out || '', r.status, r.notes || ''
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "'Attendance'!A2",
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
  } catch (err) {
    console.log('⚠️  Attendance sync error:', err.message);
  }
}

// Sync all employees to Google Sheets
async function syncEmployees(employees) {
  if (!isConfigured) return;
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: "'Employees'!A2:G10000"
    });

    if (!employees.length) return;

    const rows = employees.map(e => [
      e.full_name, e.username, e.email || '', e.phone || '', e.department, e.role, e.status
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "'Employees'!A2",
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
  } catch (err) {
    console.log('⚠️  Employee sync error:', err.message);
  }
}

// Sync all leave requests to Google Sheets
async function syncLeaves(leaves) {
  if (!isConfigured) return;
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: "'Leave Requests'!A2:H10000"
    });

    if (!leaves.length) return;

    const rows = leaves.map(l => [
      l.full_name, l.department, l.leave_type, l.start_date, l.end_date, l.reason || '', l.status, l.admin_remarks || ''
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "'Leave Requests'!A2",
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
  } catch (err) {
    console.log('⚠️  Leave sync error:', err.message);
  }
}

module.exports = { initSheets, syncAttendance, syncEmployees, syncLeaves };
