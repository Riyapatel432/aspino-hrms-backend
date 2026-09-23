const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Creating InterviewRound table in PostgreSQL if not exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "InterviewRound" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "order" INTEGER DEFAULT 1,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "InterviewRound_name_key" ON "InterviewRound"("name");
    `);
    console.log('Successfully created InterviewRound table in PostgreSQL!');
  } catch (err) {
    console.error('InterviewRound table creation error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
