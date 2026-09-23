const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const holidayLeavePermissions = [
  // ─── Holiday Permissions ──────────────────────────────────────────────────
  { name: 'read-holiday', action: 'read', module: 'holiday', application: 'HRMS', description: 'View holiday calendar and configurations' },
  { name: 'create-holiday', action: 'create', module: 'holiday', application: 'HRMS', description: 'Create holiday entries' },
  { name: 'update-holiday', action: 'update', module: 'holiday', application: 'HRMS', description: 'Edit holiday entries' },
  { name: 'delete-holiday', action: 'delete', module: 'holiday', application: 'HRMS', description: 'Delete holiday entries' },
  { name: 'manage-holiday', action: 'manage', module: 'holiday', application: 'HRMS', description: 'Full manage holiday configurations' },

  // ─── Leave Permissions ────────────────────────────────────────────────────
  { name: 'read-leave', action: 'read', module: 'leave', application: 'HRMS', description: 'View leave requests and balances' },
  { name: 'create-leave', action: 'create', module: 'leave', application: 'HRMS', description: 'Apply and submit leave applications' },
  { name: 'update-leave', action: 'update', module: 'leave', application: 'HRMS', description: 'Edit leave requests' },
  { name: 'delete-leave', action: 'delete', module: 'leave', application: 'HRMS', description: 'Delete leave requests' },
  { name: 'approve-leave', action: 'approve', module: 'leave', application: 'HRMS', description: 'Approve pending employee leave requests' },
  { name: 'reject-leave', action: 'reject', module: 'leave', application: 'HRMS', description: 'Reject employee leave requests' },
  { name: 'manage-leave', action: 'manage', module: 'leave', application: 'HRMS', description: 'Full manage leave system' },

  // ─── Leave Master Permissions ─────────────────────────────────────────────
  { name: 'read-leave_master', action: 'read', module: 'leave_master', application: 'HRMS', description: 'View leave master policies and quotas' },
  { name: 'create-leave_master', action: 'create', module: 'leave_master', application: 'HRMS', description: 'Create leave master policies' },
  { name: 'update-leave_master', action: 'update', module: 'leave_master', application: 'HRMS', description: 'Edit leave master policies' },
  { name: 'delete-leave_master', action: 'delete', module: 'leave_master', application: 'HRMS', description: 'Delete leave master policies' },

  // ─── Shift & Roster Permissions ───────────────────────────────────────────
  { name: 'read-shift_roster', action: 'read', module: 'shift_roster', application: 'HRMS', description: 'View HOD shift schedules and rosters' },
  { name: 'create-shift_roster', action: 'create', module: 'shift_roster', application: 'HRMS', description: 'Schedule and allocate department shifts' },
  { name: 'update-shift_roster', action: 'update', module: 'shift_roster', application: 'HRMS', description: 'Change and reallocate department shifts' },
  { name: 'delete-shift_roster', action: 'delete', module: 'shift_roster', application: 'HRMS', description: 'Delete shift rosters' },
  { name: 'read-shift', action: 'read', module: 'shift', application: 'HRMS', description: 'View shift timings and master list' },
  { name: 'create-shift', action: 'create', module: 'shift', application: 'HRMS', description: 'Create new shift timing masters' },
  { name: 'update-shift', action: 'update', module: 'shift', application: 'HRMS', description: 'Update shift timing masters' },
  { name: 'delete-shift', action: 'delete', module: 'shift', application: 'HRMS', description: 'Delete shift timing masters' },

  // ─── Attendance Permissions ───────────────────────────────────────────────
  { name: 'read-attendance', action: 'read', module: 'attendance', application: 'HRMS', description: 'View attendance logs and matrix' },
  { name: 'create-attendance', action: 'create', module: 'attendance', application: 'HRMS', description: 'Add attendance and punch in/out' },
  { name: 'update-attendance', action: 'update', module: 'attendance', application: 'HRMS', description: 'Edit attendance logs and break misuse' },
  { name: 'delete-attendance', action: 'delete', module: 'attendance', application: 'HRMS', description: 'Delete attendance records' },
  { name: 'import-attendance', action: 'import', module: 'attendance', application: 'HRMS', description: 'Bulk import attendance from CSV' },
  { name: 'export-attendance', action: 'export', module: 'attendance', application: 'HRMS', description: 'Export attendance logs to CSV' },
];

async function seedHolidayLeavePermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to PostgreSQL database...');

    // 1. Insert or update permissions
    let upsertedCount = 0;
    for (const p of holidayLeavePermissions) {
      await pool.query(
        `INSERT INTO permissions (id, name, action, module, application, description, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (application, module, action) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           "updatedAt" = NOW()`,
        [p.name, p.action, p.module, p.application, p.description]
      );
      upsertedCount++;
    }
    console.log(`✅ Upserted ${upsertedCount} holiday, leave, shift, and attendance permissions.`);

    // 2. Fetch all permissions map
    const allPermsRes = await pool.query('SELECT id, name, application, module, action FROM permissions');
    const allPerms = allPermsRes.rows;
    const permMap = new Map();
    for (const p of allPerms) {
      permMap.set(p.name, p.id);
      permMap.set(`${p.action}-${p.module}`, p.id);
      permMap.set(`${p.application}:${p.module}:${p.action}`, p.id);
    }

    // 3. Fetch all roles
    const rolesRes = await pool.query('SELECT id, name, "displayName" FROM roles');
    const roles = rolesRes.rows;
    console.log(`Found ${roles.length} roles: ${roles.map((r) => r.name).join(', ')}`);

    for (const r of roles) {
      const rName = (r.name || '').toUpperCase();
      let permissionsToAssign = [];

      if (rName === 'SUPER_ADMIN' || rName === 'ADMIN') {
        // Full access to ALL permissions
        permissionsToAssign = allPerms.map((p) => p.id);
      } else if (rName.includes('HR') || rName === 'HR_MANAGER') {
        // All HRMS permissions
        permissionsToAssign = allPerms
          .filter((p) => p.application === 'HRMS' || p.module === 'users' || p.module === 'activity_logs')
          .map((p) => p.id);
      } else if (rName === 'EMPLOYEE' || rName === 'USER') {
        // Employee self-service
        const empPermNames = [
          'read-leave',
          'create-leave',
          'read-attendance',
          'create-attendance',
          'read-holiday',
          'read-shift_roster',
          'read-shift',
          'sidebar-dashboard',
          'sidebar-attendance-leave',
        ];
        permissionsToAssign = empPermNames
          .map((name) => permMap.get(name))
          .filter(Boolean);
      } else {
        // Default custom role: assign HRMS read & manage permissions for holiday & leave
        permissionsToAssign = allPerms
          .filter((p) => p.application === 'HRMS')
          .map((p) => p.id);
      }

      let count = 0;
      for (const pId of permissionsToAssign) {
        await pool.query(
          `INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [r.id, pId]
        );
        count++;
      }
      console.log(`✅ Assigned ${count} permissions to role: ${r.name} (${r.displayName || ''})`);
    }

    console.log('\n🎉 Successfully added and assigned all Holiday and Leave permissions!');
  } catch (err) {
    console.error('❌ Error seeding holiday and leave permissions:', err);
  } finally {
    await pool.end();
  }
}

seedHolidayLeavePermissions();
