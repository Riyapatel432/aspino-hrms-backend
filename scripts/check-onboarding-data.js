const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const emps = await client.query('SELECT * FROM "Employee"');
    console.log('Total employees in DB:', emps.rows.length);
    console.log('Employees:', emps.rows);

    const cands = await client.query('SELECT id, "fullName", "candidateCode", stage, status FROM "Candidate"');
    console.log('Total candidates in DB:', cands.rows.length);
    console.log('Candidates:', cands.rows);

    const docs = await client.query('SELECT * FROM "OnboardingDocument"');
    console.log('Total documents:', docs.rows.length);

    const ind = await client.query('SELECT * FROM "InductionSchedule"');
    console.log('Total inductions:', ind.rows.length);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
