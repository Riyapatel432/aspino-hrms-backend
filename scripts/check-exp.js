const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    const emps = await client.query('SELECT id, "employeeId", "firstName", "lastName", email, designation, "totalExperienceYears" FROM "Employee"');
    console.log('EMPLOYEES:', JSON.stringify(emps.rows, null, 2));

    const cands = await client.query('SELECT id, name, email, "experienceYears" FROM "Candidate"');
    console.log('CANDIDATES:', JSON.stringify(cands.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
