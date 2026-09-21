const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring interviewRoundId column exists...');
    await pool.query(`
      ALTER TABLE IF EXISTS "InterviewSchedule" 
      ADD COLUMN IF NOT EXISTS "interviewRoundId" TEXT;
    `);
    
    // First match and set interviewRoundId if roundName matches InterviewRound name
    await pool.query(`
      UPDATE "InterviewSchedule" s
      SET "interviewRoundId" = r.id
      FROM "InterviewRound" r
      WHERE LOWER(TRIM(s."roundName")) = LOWER(TRIM(r."name"))
        AND (s."interviewRoundId" IS NULL OR s."interviewRoundId" = '');
    `);

    // Now update roundName to store master ID wherever interviewRoundId is set
    await pool.query(`
      UPDATE "InterviewSchedule" s
      SET "roundName" = s."interviewRoundId"
      WHERE s."interviewRoundId" IS NOT NULL 
        AND s."interviewRoundId" != ''
        AND s."roundName" != s."interviewRoundId";
    `);

    console.log('Successfully updated InterviewSchedule roundName to store Master ID in PostgreSQL!');

    const res = await pool.query(`
      SELECT id, "candidateId", "interviewRoundId", "roundName", "scheduledAt", "status"
      FROM "InterviewSchedule"
      ORDER BY id ASC;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
