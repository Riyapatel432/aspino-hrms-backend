const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const roleRes = await pool.query("SELECT id, name FROM roles WHERE name = 'TEST_COORDINATOR'");
  if (roleRes.rows.length === 0) return console.log('No TEST_COORDINATOR role found');
  const roleId = roleRes.rows[0].id;
  const perms = await pool.query(
    `SELECT p.name, p.module, p.action FROM role_permissions rp
     JOIN permissions p ON rp."permissionId" = p.id
     WHERE rp."roleId" = $1
     ORDER BY p.module, p.name`,
    [roleId]
  );
  console.log('Total perms for TEST_COORDINATOR:', perms.rows.length);
  const exitPerms = perms.rows.filter(p => ['exit', 'resignation_clearance', 'fnf_settlement', 'relieving_letters'].includes(p.module));
  console.log('Exit & Submodule perms:', exitPerms.map(p => p.name));
}

main().finally(() => pool.end());
