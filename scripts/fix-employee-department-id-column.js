const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring departmentId column exists on Employee table in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
    `);

    // If department_id exists, sync data
    try {
      await pool.query(`
        UPDATE "Employee" SET "departmentId" = "department_id" WHERE "departmentId" IS NULL AND "department_id" IS NOT NULL;
      `);
    } catch (e) {}

    // Ensure at least one department ID is set as fallback if null
    const deptRes = await pool.query('SELECT id FROM "Department" LIMIT 1');
    if (deptRes.rows.length > 0) {
      const defaultDeptId = deptRes.rows[0].id;
      await pool.query(`UPDATE "Employee" SET "departmentId" = $1 WHERE "departmentId" IS NULL OR "departmentId" = ''`, [defaultDeptId]);
    }

    console.log('Successfully updated departmentId column on Employee table in PostgreSQL!');
  } catch (err) {
    console.error('Employee departmentId update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
