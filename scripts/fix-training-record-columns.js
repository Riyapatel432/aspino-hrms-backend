const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring missing TrainingRecord table columns exist in PostgreSQL...');

    await pool.query(`
      ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "trainingTypeId" TEXT;
      ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE IF EXISTS "TrainingRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    `);

    // Ensure at least one TrainingType exists as fallback
    let typeRes = await pool.query('SELECT id FROM "TrainingType" LIMIT 1');
    let defaultTypeId;
    if (typeRes.rows.length === 0) {
      const crypto = require('crypto');
      defaultTypeId = crypto.randomUUID();
      await pool.query('INSERT INTO "TrainingType" (id, name, "isActive", "createdAt") VALUES ($1, $2, true, NOW())', [defaultTypeId, 'General Training']);
    } else {
      defaultTypeId = typeRes.rows[0].id;
    }

    await pool.query(`UPDATE "TrainingRecord" SET "trainingTypeId" = $1 WHERE "trainingTypeId" IS NULL OR "trainingTypeId" = ''`, [defaultTypeId]);

    console.log('Successfully updated TrainingRecord table columns in PostgreSQL!');
  } catch (err) {
    console.error('TrainingRecord columns update error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
