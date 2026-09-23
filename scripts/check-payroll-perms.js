const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const perms = await pool.query(`
    SELECT id, name, module, action, description
    FROM permissions
    WHERE module ILIKE '%payroll%'
       OR module ILIKE '%salary%'
       OR module ILIKE '%hra%'
       OR module ILIKE '%tax%'
       OR module ILIKE '%loan%'
       OR module ILIKE '%month%'
       OR module ILIKE '%payslip%'
       OR module ILIKE '%report%'
    ORDER BY module, name
  `);
  console.log('Found payroll-related permissions:', perms.rows.length);
  console.log(JSON.stringify(perms.rows, null, 2));
}

main().finally(() => pool.end());
