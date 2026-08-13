const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding missing Candidate columns (including updatedAt) in PostgreSQL...');
    await pool.query(`
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "isReInterview" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectionCount" INTEGER DEFAULT 0;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "coolOffDaysLeft" INTEGER DEFAULT 0;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Successfully updated Candidate table columns in PostgreSQL!');
  } catch (err) {
    console.error('Candidate columns update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
