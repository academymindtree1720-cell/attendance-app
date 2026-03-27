import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getEmployees } from './lib/sheets.js';

(async () => {
  try {
    console.log('ENV GOOGLE_SHEET_ID=', process.env.GOOGLE_SHEET_ID);
    const employees = await getEmployees();
    console.log('Employees from sheet:', employees);
    const target = 'nandanrajay479@gmail.com'.toLowerCase();
    const found = employees.find((emp) => emp.email?.toLowerCase() === target);
    console.log('Target employee:', found);
  } catch (err) {
    console.error('Error reading employees:', err);
    process.exit(1);
  }
})();
