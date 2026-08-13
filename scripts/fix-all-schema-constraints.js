const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Running comprehensive database schema alignment...');

    // 1. Department
    await pool.query(`ALTER TABLE IF EXISTS "Department" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`);

    // 2. TrainingType
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TrainingType" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TrainingType_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "TrainingType_name_key" ON "TrainingType"("name");
      ALTER TABLE IF EXISTS "TrainingType" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    `);

    // 3. FiscalYear
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "FiscalYear" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "FiscalYear_name_key" ON "FiscalYear"("name");
      ALTER TABLE IF EXISTS "FiscalYear" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    `);

    // 4. DepartmentLeaveMaster
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
    
    try { await pool.query(`ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ALTER COLUMN "department" DROP NOT NULL;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE IF EXISTS "DepartmentLeaveMaster" ALTER COLUMN "fiscalYear" DROP NOT NULL;`); } catch(e) {}
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentLeaveMaster_departmentId_fiscalYearId_key" ON "DepartmentLeaveMaster"("departmentId", "fiscalYearId");`);

    // 5. Candidate
    await pool.query(`
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "isReInterview" BOOLEAN DEFAULT false;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectionCount" INTEGER DEFAULT 0;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "coolOffDaysLeft" INTEGER DEFAULT 0;
      ALTER TABLE IF EXISTS "Candidate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    `);

    // 6. TrainingRecord
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TrainingRecord" (
        "id" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "trainingName" TEXT NOT NULL,
        "trainingTypeId" TEXT NOT NULL,
        "completionDate" TIMESTAMP(3) NOT NULL,
        "expiryDate" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'COMPLETED',
        CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('Successfully aligned all database schema constraints!');
  } catch (err) {
    console.error('Schema alignment error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
