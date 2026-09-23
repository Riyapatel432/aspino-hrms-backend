const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query(`
    SELECT id, name, module, action, application, description
    FROM permissions
    ORDER BY application, module, action, name
  `);
  console.log(`Total permissions in DB: ${res.rows.length}`);
  console.log(JSON.stringify(res.rows, null, 2));
}

main().finally(() => pool.end());
