const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp' });

async function main() {
  const res = await pool.query(`
    SELECT id, name, action, module 
    FROM permissions 
    WHERE module ILIKE ANY(ARRAY['%quotation%', '%purchase%', '%invoice%', '%credit%', '%debit%', '%challan%', '%gatepass%', '%gate_pass%', '%audit%'])
       OR name ILIKE ANY(ARRAY['%quotation%', '%purchase%', '%invoice%', '%credit%', '%debit%', '%challan%', '%gatepass%', '%gate-pass%'])
    ORDER BY module, name;
  `);
  console.log('Total matching permissions:', res.rows.length);
  console.log(JSON.stringify(res.rows, null, 2));
}

main().catch(console.error).finally(() => pool.end());
