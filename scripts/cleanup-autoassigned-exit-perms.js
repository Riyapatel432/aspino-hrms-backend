const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Find permissions related to exit submodules
  const permsRes = await pool.query(`
    SELECT id, name, module FROM permissions
    WHERE module IN ('exit', 'resignation_clearance', 'fnf_settlement', 'relieving_letters')
  `);
  const exitPermIds = permsRes.rows.map(p => p.id);
  console.log(`Found ${exitPermIds.length} exit permissions in DB.`);

  // Find non-admin roles like TEST_COORDINATOR
  const rolesRes = await pool.query(`
    SELECT id, name FROM roles
    WHERE name = 'TEST_COORDINATOR'
  `);

  for (const r of rolesRes.rows) {
    const delRes = await pool.query(
      `DELETE FROM role_permissions
       WHERE "roleId"::text = $1::text AND "permissionId"::text = ANY($2::text[])`,
      [String(r.id), exitPermIds.map(String)]
    );
    console.log(`Removed ${delRes.rowCount} exit permissions from role: ${r.name}`);
  }

  // Update seed-exit-permissions.js to only assign to SUPER_ADMIN and ADMIN by default
}

main().finally(() => pool.end());
