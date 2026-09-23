const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const rolePerms = await pool.query(`
    SELECT r.name as role_name, p.name as perm_name, p.module, p.action, p.application
    FROM role_permissions rp
    JOIN permissions p ON rp."permissionId" = p.id
    JOIN roles r ON rp."roleId" = r.id
    WHERE r.name = 'TEST_COORDINATOR'
    ORDER BY p.module, p.action
  `);
  console.log('TEST_COORDINATOR permissions count:', rolePerms.rows.length);
  console.log('TEST_COORDINATOR permissions:', rolePerms.rows);

  await pool.end();
}

check();
