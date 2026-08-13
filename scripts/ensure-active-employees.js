const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp'
  });

  try {
    console.log('Ensuring employee status is ACTIVE for payroll...');
    await pool.query(`UPDATE "Employee" SET status = 'ACTIVE'::"EmployeeStatus" WHERE status = 'RELIEVED'::"EmployeeStatus";`);
    console.log('Successfully updated employees to ACTIVE status!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
