const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp'
  });

  try {
    console.log('Adding ON_LEAVE and HOLIDAY to AttendanceStatus enum in PostgreSQL...');
    await pool.query(`ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'ON_LEAVE';`);
    await pool.query(`ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'HOLIDAY';`);
    console.log('✓ Successfully added ON_LEAVE and HOLIDAY to AttendanceStatus!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
