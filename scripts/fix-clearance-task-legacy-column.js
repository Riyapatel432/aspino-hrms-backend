const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Dropping NOT NULL on legacy department column on ClearanceTask table in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "ClearanceTask" ALTER COLUMN "department" DROP NOT NULL;
    `);

    console.log('Successfully dropped NOT NULL constraint on ClearanceTask.department in PostgreSQL!');
  } catch (err) {
    console.error('ClearanceTask legacy column update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
