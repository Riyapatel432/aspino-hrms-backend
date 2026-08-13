const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding missing columns to InterviewSchedule and related tables in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "InterviewSchedule" ADD COLUMN IF NOT EXISTS "isReschedule" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "InterviewSchedule" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER DEFAULT 1;
    `);

    await pool.query(`
      ALTER TABLE IF EXISTS "InterviewFeedback" ADD COLUMN IF NOT EXISTS "panelistId" TEXT;
    `);

    await pool.query(`
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "otHours" DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "lateHours" DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "earlyGoingHours" DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "presentDay" DOUBLE PRECISION DEFAULT 1.0;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isHalfDay" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isSundayPresent" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isFullNightPresent" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "isHolidayPresent" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Attendance" ADD COLUMN IF NOT EXISTS "captureMethod" TEXT DEFAULT 'BIOMETRIC';
    `);

    console.log('Successfully updated InterviewSchedule and related table columns in PostgreSQL!');
  } catch (err) {
    console.error('Column update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
