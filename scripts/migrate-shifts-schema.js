const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL database to migrate Shift and Roster tables...');

    // 1. Update Shift table
    await client.query(`
      ALTER TABLE "Shift" 
      ADD COLUMN IF NOT EXISTS "graceTimeMinutes" INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS "breakDurationMinutes" INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS "breakRules" TEXT,
      ADD COLUMN IF NOT EXISTS "isNightShift" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "color" VARCHAR(50) DEFAULT '#0284c7',
      ADD COLUMN IF NOT EXISTS "description" TEXT;
    `);
    console.log('✔ Shift table columns verified & added.');

    // 2. Update ShiftRoster table
    await client.query(`
      ALTER TABLE "ShiftRoster" 
      ADD COLUMN IF NOT EXISTS "reason" TEXT;
    `);
    console.log('✔ ShiftRoster table columns verified & added.');

    // 3. Create ShiftAuditLog table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ShiftAuditLog" (
        "id" TEXT NOT NULL,
        "rosterId" TEXT,
        "employeeId" TEXT NOT NULL,
        "oldShiftId" TEXT,
        "oldShiftName" TEXT,
        "newShiftId" TEXT NOT NULL,
        "newShiftName" TEXT NOT NULL,
        "rosterDate" TIMESTAMP(3) NOT NULL,
        "changedById" TEXT,
        "changedByName" TEXT NOT NULL,
        "changedByRole" TEXT NOT NULL DEFAULT 'HOD',
        "reason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ShiftAuditLog_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✔ ShiftAuditLog table verified & created.');

    // Foreign keys
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'ShiftAuditLog_employeeId_fkey'
        ) THEN
          ALTER TABLE "ShiftAuditLog" 
          ADD CONSTRAINT "ShiftAuditLog_employeeId_fkey" 
          FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'ShiftAuditLog_rosterId_fkey'
        ) THEN
          ALTER TABLE "ShiftAuditLog" 
          ADD CONSTRAINT "ShiftAuditLog_rosterId_fkey" 
          FOREIGN KEY ("rosterId") REFERENCES "ShiftRoster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✔ Foreign keys verified & configured.');

    console.log('Database migration for Shift Schedule & Audit Logs completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
