const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.name, u.email, u.role, u."roleId"
    FROM "User" u
    WHERE u.role ILIKE '%COORDINATOR%' OR u.email ILIKE '%coordinator%'
  `);
  console.log('Users found:', usersRes.rows);

  const rolesRes = await pool.query(`SELECT id, name FROM roles WHERE name ILIKE '%COORDINATOR%'`);
  console.log('Roles found:', rolesRes.rows);

  if (rolesRes.rows.length > 0) {
    const roleId = rolesRes.rows[0].id;
    const permsRes = await pool.query(`
      SELECT p.id, p.name, p.module, p.action, p.application
      FROM role_permissions rp
      JOIN permissions p ON rp."permissionId" = p.id
      WHERE rp."roleId" = $1
      ORDER BY p.module, p.name
    `, [roleId]);
    console.log('TEST_COORDINATOR permissions in DB:', permsRes.rows.map(p => p.name));
  }
}

main().finally(() => pool.end());
