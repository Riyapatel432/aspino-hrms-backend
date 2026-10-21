require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT id, name, action, module 
      FROM permissions 
      WHERE module ILIKE '%quotation%' 
         OR module ILIKE '%purchase%' 
         OR module ILIKE '%invoice%' 
         OR module ILIKE '%credit%' 
         OR module ILIKE '%debit%' 
         OR module ILIKE '%challan%' 
         OR name ILIKE '%quotation%' 
         OR name ILIKE '%purchase%' 
         OR name ILIKE '%invoice%' 
         OR name ILIKE '%credit%' 
         OR name ILIKE '%debit%' 
         OR name ILIKE '%challan%' 
      ORDER BY module, name;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
