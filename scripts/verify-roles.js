const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const roles = await pool.query(
      'SELECT r.name, count(rp."permissionId") as count FROM roles r LEFT JOIN role_permissions rp ON r.id = rp."roleId" GROUP BY r.name ORDER BY r.name'
    );
    console.log('Role Permissions Count:');
    console.table(roles.rows);

    const users = await pool.query(
      'SELECT u.email, u.role, r.name as role_relation FROM "User" u LEFT JOIN roles r ON u."roleId" = r.id ORDER BY u.email'
    );
    console.log('\nUsers and Linked Roles:');
    console.table(users.rows);
  } finally {
    await pool.end();
  }
}

check();
