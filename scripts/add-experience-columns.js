const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Adding experience columns to JobRequisition, Candidate, and Employee...');

    await client.query(`
      ALTER TABLE "JobRequisition" ADD COLUMN IF NOT EXISTS "experienceRequired" DOUBLE PRECISION DEFAULT 0.0;
      ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "experienceYears" DOUBLE PRECISION DEFAULT 0.0;
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "totalExperienceYears" DOUBLE PRECISION DEFAULT 0.0;
    `);

    console.log('Columns successfully added to database tables.');
  } catch (err) {
    console.error('Error adding experience columns:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
