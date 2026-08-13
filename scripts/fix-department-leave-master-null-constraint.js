const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Dropping legacy NOT NULL constraint on department column in DepartmentLeaveMaster table...');
    await pool.query(`
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ALTER COLUMN "department" DROP NOT NULL;
    `);
    console.log('Successfully updated department column constraint in DepartmentLeaveMaster table!');
  } catch (err) {
    console.error('DepartmentLeaveMaster constraint fix error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
