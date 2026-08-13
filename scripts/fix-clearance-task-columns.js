const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring missing ClearanceTask table columns exist in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "ClearanceTask" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
    `);

    // If department column exists, sync data
    try {
      await pool.query(`
        UPDATE "ClearanceTask" SET "departmentId" = "department" WHERE "departmentId" IS NULL AND "department" IS NOT NULL;
      `);
    } catch (e) {}

    // Ensure at least one department ID is set as fallback if null
    const deptRes = await pool.query('SELECT id FROM "Department" LIMIT 1');
    if (deptRes.rows.length > 0) {
      const defaultDeptId = deptRes.rows[0].id;
      await pool.query(`UPDATE "ClearanceTask" SET "departmentId" = $1 WHERE "departmentId" IS NULL OR "departmentId" = ''`, [defaultDeptId]);
    }

    console.log('Successfully updated ClearanceTask table columns in PostgreSQL!');
  } catch (err) {
    console.error('ClearanceTask columns update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
