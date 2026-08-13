const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring missing Employee table columns exist in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "qrToken" TEXT DEFAULT gen_random_uuid()::text;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "location" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "bankId" INTEGER;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "ifscCode" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
      ALTER TABLE IF EXISTS "Employee" ADD COLUMN IF NOT EXISTS "probationEnd" TIMESTAMP(3);
    `);

    // Ensure at least one Department exists
    const deptRes = await pool.query('SELECT id FROM "Department" LIMIT 1');
    if (deptRes.rows.length === 0) {
      const crypto = require('crypto');
      const deptId = crypto.randomUUID();
      await pool.query('INSERT INTO "Department" (id, name, "isActive", "createdAt") VALUES ($1, $2, true, NOW())', [deptId, 'Production']);
      console.log('Created default Production department');
    }

    console.log('Successfully updated Employee table columns in PostgreSQL!');
  } catch (err) {
    console.error('Employee columns update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
