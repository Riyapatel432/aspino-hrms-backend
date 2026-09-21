const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Dropping location column from Candidate, OfferLetter, and Employee tables in PostgreSQL...');
    await pool.query(`
      ALTER TABLE IF EXISTS "Candidate" DROP COLUMN IF EXISTS "location";
      ALTER TABLE IF EXISTS "OfferLetter" DROP COLUMN IF EXISTS "location";
      ALTER TABLE IF EXISTS "Employee" DROP COLUMN IF EXISTS "location";
    `);

    console.log('Successfully dropped location column from tables!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
