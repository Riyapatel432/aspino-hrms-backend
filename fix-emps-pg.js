require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query("UPDATE \"Employee\" SET status = 'ACTIVE' WHERE status = 'RELIEVED'");
  console.log(`Updated ${result.rowCount} employees to ACTIVE.`);
  await pool.end();
}
main().catch(console.error);
