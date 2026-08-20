const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding missing JobRequisition columns (jobSpecification) in PostgreSQL...');
    await pool.query(`
      ALTER TABLE IF EXISTS "JobRequisition" ADD COLUMN IF NOT EXISTS "jobSpecification" TEXT;
    `);
    console.log('Successfully updated JobRequisition table in PostgreSQL!');
  } catch (err) {
    console.error('JobRequisition column update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
