const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('TABLES:', tables.rows.map(t => t.table_name));

    const users = await pool.query('SELECT id, name, email, role, "roleId" FROM "User"');
    console.log('\nUSERS:', users.rows);

    const roles = await pool.query(`
      SELECT r.id, r.name, COUNT(rp."permissionId") as perm_count 
      FROM roles r 
      LEFT JOIN role_permissions rp ON r.id = rp."roleId" 
      GROUP BY r.id, r.name
    `);
    console.log('\nROLES:', roles.rows);

    const empPerms = await pool.query(`
      SELECT r.name as role_name, p.name as perm_name, p.module, p.action, p.application
      FROM roles r 
      JOIN role_permissions rp ON r.id = rp."roleId" 
      JOIN permissions p ON rp."permissionId" = p.id 
      WHERE r.name = 'EMPLOYEE'
    `);
    console.log('\nEMPLOYEE PERMISSIONS IN DB:', empPerms.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();
