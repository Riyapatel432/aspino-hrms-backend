const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding isActive column to Department table...');
    await pool.query('ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;');
    console.log('Successfully added isActive column to Department table!');
  } catch (err) {
    console.error('Department update:', err.message);
  }

  try {
    console.log('Adding isActive column to TrainingType table if exists...');
    await pool.query('ALTER TABLE IF EXISTS "TrainingType" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;');
  } catch (err) {
    console.error('TrainingType update:', err.message);
  }

  await pool.end();
}

run();
