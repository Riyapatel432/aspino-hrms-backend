const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT id, name, module, action, application 
    FROM permissions 
    WHERE module ILIKE ANY(ARRAY['%quotation%', '%purchase%', '%invoice%', '%credit%', '%debit%', '%challan%', '%gate%'])
       OR name ILIKE ANY(ARRAY['%quotation%', '%purchase%', '%invoice%', '%credit%', '%debit%', '%challan%', '%gate%'])
    ORDER BY module, action
  `);
  console.log('Total matching permissions:', res.rows.length);
  for (const row of res.rows) {
    console.log(`[${row.application}] module: "${row.module}" | action: "${row.action}" | name: "${row.name}"`);
  }

  // Also check distinct modules in permissions table
  const distinct = await pool.query('SELECT DISTINCT module FROM permissions ORDER BY module');
  console.log('\nAll distinct modules in permissions table:');
  console.log(distinct.rows.map(r => r.module).join(', '));

  await pool.end();
}

run();
