const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

async function syncEmployeePermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database to sync EMPLOYEE role permissions...');
    
    // 1. Get or create EMPLOYEE role
    let empRoleRes = await pool.query(`SELECT id FROM roles WHERE name = 'EMPLOYEE'`);
    let employeeRoleId;
    if (empRoleRes.rows.length === 0) {
      const createRole = await pool.query(`
        INSERT INTO roles (name, "displayName", description, "isSystem", "updatedAt")
        VALUES ('EMPLOYEE', 'Employee', 'Standard employee portal access for attendance, leave, payslips, training and performance', true, NOW())
        RETURNING id
      `);
      employeeRoleId = createRole.rows[0].id;
    } else {
      employeeRoleId = empRoleRes.rows[0].id;
    }

    // 2. Essential permissions for employee
    const requiredPerms = [
      { app: 'HRMS', module: 'app.hrms', action: 'read', name: 'read-app.hrms' },
      { app: 'HRMS', module: 'employee', action: 'read', name: 'read-employee' },
      { app: 'HRMS', module: 'attendance', action: 'read', name: 'read-attendance' },
      { app: 'HRMS', module: 'attendance', action: 'create', name: 'create-attendance' },
      { app: 'HRMS', module: 'leave', action: 'read', name: 'read-leave' },
      { app: 'HRMS', module: 'leave', action: 'create', name: 'create-leave' },
      { app: 'HRMS', module: 'payroll', action: 'read', name: 'read-payroll' },
      { app: 'HRMS', module: 'payroll', action: 'create', name: 'create-payroll' },
      { app: 'HRMS', module: 'performance', action: 'read', name: 'read-performance' },
      { app: 'HRMS', module: 'performance', action: 'create', name: 'create-performance' },
      { app: 'HRMS', module: 'performance', action: 'update', name: 'update-performance' },
      { app: 'HRMS', module: 'training', action: 'read', name: 'read-training' },
      { app: 'HRMS', module: 'department', action: 'read', name: 'read-department' },
      { app: 'HRMS', module: 'onboarding', action: 'read', name: 'read-onboarding' },
      { app: 'HRMS', module: 'exit', action: 'read', name: 'read-exit' },
      { app: 'HRMS', module: 'exit', action: 'create', name: 'create-exit' },
    ];

    for (const p of requiredPerms) {
      // Find or insert permission
      let permRes = await pool.query(`
        SELECT id FROM permissions WHERE application = $1 AND module = $2 AND action = $3
      `, [p.app, p.module, p.action]);

      let permId;
      if (permRes.rows.length === 0) {
        const insertP = await pool.query(`
          INSERT INTO permissions (application, module, action, name, description, "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [p.app, p.module, p.action, p.name, `Allows ${p.action} on ${p.module}`]);
        permId = insertP.rows[0].id;
      } else {
        permId = permRes.rows[0].id;
        // Make sure name is formatted as action-module
        await pool.query(`UPDATE permissions SET name = $1 WHERE id = $2`, [p.name, permId]);
      }

      // Link to EMPLOYEE role
      await pool.query(`
        INSERT INTO role_permissions ("roleId", "permissionId")
        VALUES ($1, $2)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
      `, [employeeRoleId, permId]);
    }

    // 3. Ensure all users with role 'EMPLOYEE' or 'USER' are linked to a valid role
    await pool.query(`
      UPDATE "User" 
      SET "roleId" = $1 
      WHERE ("roleId" IS NULL OR "roleId" = '') AND (UPPER(role) = 'EMPLOYEE' OR UPPER(role) = 'USER')
    `, [employeeRoleId]);

    console.log('✅ Successfully synced EMPLOYEE role permissions and linked employee accounts!');

    const currentEmpPerms = await pool.query(`
      SELECT p.name, p.module, p.action 
      FROM role_permissions rp 
      JOIN permissions p ON rp."permissionId" = p.id 
      WHERE rp."roleId" = $1
    `, [employeeRoleId]);
    console.log(`\nEMPLOYEE has ${currentEmpPerms.rows.length} active permissions:`);
    currentEmpPerms.rows.forEach(r => console.log(` - ${r.name} (${r.module}:${r.action})`));

  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    await pool.end();
  }
}

syncEmployeePermissions();
