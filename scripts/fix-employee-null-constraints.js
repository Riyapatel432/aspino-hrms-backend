const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Fixing qrToken and Employee null constraints in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "Employee" ALTER COLUMN "qrToken" DROP NOT NULL;
      ALTER TABLE IF EXISTS "Employee" ALTER COLUMN "probationStatus" DROP NOT NULL;
    `);

    console.log('Successfully updated Employee table column constraints in PostgreSQL!');
  } catch (err) {
    console.error('Constraint update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
