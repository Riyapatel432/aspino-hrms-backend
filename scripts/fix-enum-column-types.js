const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp'
  });

  try {
    console.log('Fixing PostgreSQL column types for Enums...');

    // 1. Employee.status -> EmployeeStatus
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'EXITING', 'RELIEVED', 'TERMINATED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Alter Employee.status column
    await pool.query(`
      ALTER TABLE "Employee" ALTER COLUMN "status" DROP DEFAULT;
      ALTER TABLE "Employee" ALTER COLUMN "status" TYPE "EmployeeStatus" USING "status"::"EmployeeStatus";
      ALTER TABLE "Employee" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"EmployeeStatus";
    `);
    console.log('Successfully altered Employee.status column to "EmployeeStatus" enum!');

    // 2. ProbationStatus
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "ProbationStatus" AS ENUM ('UNDER_REVIEW', 'PASSED', 'EXTENDED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await pool.query(`
      ALTER TABLE "Employee" ALTER COLUMN "probationStatus" DROP DEFAULT;
      ALTER TABLE "Employee" ALTER COLUMN "probationStatus" TYPE "ProbationStatus" USING "probationStatus"::"ProbationStatus";
      ALTER TABLE "Employee" ALTER COLUMN "probationStatus" SET DEFAULT 'UNDER_REVIEW'::"ProbationStatus";
    `);
    console.log('Successfully altered Employee.probationStatus column to "ProbationStatus" enum!');

  } catch (err) {
    console.error('Error altering columns:', err);
  } finally {
    await pool.end();
  }
}

run();
