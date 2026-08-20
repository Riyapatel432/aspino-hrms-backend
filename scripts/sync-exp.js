const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      UPDATE "Employee" e
      SET "totalExperienceYears" = c."experienceYears"
      FROM "Candidate" c
      WHERE LOWER(e.email) = LOWER(c.email) AND c."experienceYears" > 0;
    `);
    console.log(`Synced ${res.rowCount} employee records from candidates.`);

    const check = await client.query('SELECT "employeeId", "firstName", "lastName", email, "totalExperienceYears" FROM "Employee"');
    console.log('Updated Employees:', check.rows);
  } catch (err) {
    console.error('Error syncing:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
