const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Adding RequisitionType enum and columns to PostgreSQL...');
    
    // Create RequisitionType enum if it does not exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequisitionType') THEN
          CREATE TYPE "RequisitionType" AS ENUM ('NEW_REQUIREMENT', 'REPLACEMENT');
        END IF;
      END
      $$;
    `);

    // Add requisitionType column
    await pool.query(`
      ALTER TABLE IF EXISTS "JobRequisition" 
      ADD COLUMN IF NOT EXISTS "requisitionType" "RequisitionType" DEFAULT 'NEW_REQUIREMENT';
    `);

    // Add replacementForEmployeeId column
    await pool.query(`
      ALTER TABLE IF EXISTS "JobRequisition" 
      ADD COLUMN IF NOT EXISTS "replacementForEmployeeId" TEXT;
    `);

    // Add foreign key constraint if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'JobRequisition_replacementForEmployeeId_fkey'
        ) THEN
          ALTER TABLE "JobRequisition"
          ADD CONSTRAINT "JobRequisition_replacementForEmployeeId_fkey"
          FOREIGN KEY ("replacementForEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `);

    console.log('Successfully updated JobRequisition columns in PostgreSQL!');
  } catch (err) {
    console.error('JobRequisition column update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
