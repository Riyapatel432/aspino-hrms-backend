const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Creating/Updating DepartmentLeaveMaster table in PostgreSQL...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "DepartmentLeaveMaster" (
        "id" TEXT NOT NULL,
        "departmentId" TEXT NOT NULL,
        "fiscalYearId" TEXT NOT NULL,
        "casualLeave" INTEGER NOT NULL,
        "sickLeave" INTEGER NOT NULL,
        "earnedLeave" INTEGER NOT NULL,
        "otherLeave" INTEGER NOT NULL DEFAULT 0,
        "totalLeave" INTEGER NOT NULL,
        "effectiveFrom" TIMESTAMP(3) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DepartmentLeaveMaster_pkey" PRIMARY KEY ("id")
      );
    `);
    await pool.query(`
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "fiscalYearId" TEXT;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "casualLeave" INTEGER;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "sickLeave" INTEGER;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "earnedLeave" INTEGER;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "otherLeave" INTEGER DEFAULT 0;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "totalLeave" INTEGER;
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
      ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentLeaveMaster_departmentId_fiscalYearId_key" ON "DepartmentLeaveMaster"("departmentId", "fiscalYearId");
    `);
    console.log('Successfully created/updated DepartmentLeaveMaster table in PostgreSQL!');
  } catch (err) {
    console.error('DepartmentLeaveMaster table error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
