const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function grantAllPermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database...');

    // 1. Fetch all permissions
    const allPermsRes = await pool.query('SELECT id, name, application, module, action FROM permissions');
    const allPerms = allPermsRes.rows;
    console.log(`Total permissions in system: ${allPerms.length}`);

    // HRMS specific & global permissions
    const hrmsPerms = allPerms.filter(p => (p.application || 'GLOBAL').toUpperCase() === 'HRMS' || (p.application || 'GLOBAL').toUpperCase() === 'GLOBAL');
    // Gatepass specific & global permissions
    const gatepassPerms = allPerms.filter(p => (p.application || 'GLOBAL').toUpperCase() === 'GATEPASS' || (p.application || 'GLOBAL').toUpperCase() === 'GLOBAL');

    // 2. Fetch all roles
    const rolesRes = await pool.query('SELECT id, name FROM roles');
    console.log('Existing roles:', rolesRes.rows.map(r => r.name));

    // Ensure roles exist: SUPER_ADMIN, HR_MANAGER, HR, EMPLOYEE, USER, SECURITY, ADMIN
    const requiredRoles = [
      { name: 'SUPER_ADMIN', displayName: 'Super Admin', perms: allPerms },
      { name: 'ADMIN', displayName: 'Admin', perms: allPerms },
      { name: 'HR_MANAGER', displayName: 'HR Manager', perms: allPerms },
      { name: 'HR', displayName: 'HR', perms: allPerms },
      { name: 'EMPLOYEE', displayName: 'Employee', perms: allPerms },
      { name: 'USER', displayName: 'User', perms: allPerms },
      { name: 'SECURITY', displayName: 'Security', perms: allPerms },
    ];

    for (const r of requiredRoles) {
      let roleId;
      const existing = rolesRes.rows.find(x => x.name.toUpperCase() === r.name);
      if (!existing) {
        const createRes = await pool.query(
          `INSERT INTO roles (name, "displayName", description, "isSystem", "updatedAt")
           VALUES ($1, $2, $3, true, NOW())
           RETURNING id`,
          [r.name, r.displayName, `Full access role for ${r.displayName}`]
        );
        roleId = createRes.rows[0].id;
        console.log(`Created role: ${r.name}`);
      } else {
        roleId = existing.id;
      }

      // Assign all permissions to this role
      let assignedCount = 0;
      for (const p of r.perms) {
        await pool.query(
          `INSERT INTO role_permissions ("roleId", "permissionId")
           VALUES ($1, $2)
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [roleId, p.id]
        );
        assignedCount++;
      }
      console.log(`✅ Granted ${assignedCount} permissions to role: ${r.name}`);
    }

    // 3. Link all users to their role
    const usersRes = await pool.query('SELECT id, name, email, role, "roleId" FROM "User"');
    for (const u of usersRes.rows) {
      const userRoleName = (u.role || 'USER').toUpperCase();
      const matchedRole = requiredRoles.find(r => r.name === userRoleName) || requiredRoles.find(r => r.name === 'EMPLOYEE');
      if (matchedRole) {
        const rRes = await pool.query('SELECT id FROM roles WHERE name = $1', [matchedRole.name]);
        if (rRes.rows.length > 0) {
          await pool.query('UPDATE "User" SET "roleId" = $1 WHERE id = $2', [rRes.rows[0].id, u.id]);
          console.log(`Linked user ${u.email} (${u.name}) -> role ${matchedRole.name}`);
        }
      }
    }

    console.log('\n🎉 ALL permissions have been successfully granted to HR, EMPLOYEE, ADMIN, and USER roles!');
  } catch (err) {
    console.error('Error granting permissions:', err);
  } finally {
    await pool.end();
  }
}

grantAllPermissions();
