const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Creating TrainingType table in PostgreSQL if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TrainingType" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TrainingType_pkey" PRIMARY KEY ("id")
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TrainingType_name_key" ON "TrainingType"("name");
    `);
    console.log('Successfully created TrainingType table in PostgreSQL!');
  } catch (err) {
    console.error('TrainingType table creation error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
