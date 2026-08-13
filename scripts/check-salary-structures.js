const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp'
  });

  try {
    const empRes = await pool.query('SELECT id, "employeeId", "firstName", "lastName", status FROM "Employee";');
    console.log(`Found ${empRes.rows.length} employees:`);
    for (const emp of empRes.rows) {
      console.log(`- ${emp.firstName} ${emp.lastName} (${emp.employeeId}): status = ${emp.status}`);
    }

    const structRes = await pool.query('SELECT id, "employeeId", "basicSalary", "grossSalary" FROM "SalaryStructure";');
    console.log(`\nFound ${structRes.rows.length} salary structures:`);
    for (const s of structRes.rows) {
      console.log(`- Struct ID ${s.id} for employee ${s.employeeId}: basic = ${s.basicSalary}, gross = ${s.grossSalary}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
