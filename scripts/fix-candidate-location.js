const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding location column to Candidate and OfferLetter tables in PostgreSQL...');
    await pool.query(`
      ALTER TABLE IF EXISTS "Candidate" 
      ADD COLUMN IF NOT EXISTS "location" TEXT;
    `);

    await pool.query(`
      ALTER TABLE IF EXISTS "OfferLetter" 
      ADD COLUMN IF NOT EXISTS "location" TEXT;
    `);

    console.log('Successfully updated Candidate and OfferLetter tables with location column in PostgreSQL!');

    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Candidate' AND column_name = 'location';
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
