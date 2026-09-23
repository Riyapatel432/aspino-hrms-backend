import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function seedRBAC() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Seeding Permissions, Roles, and Role-Permissions...');

  try {
    // 1. Defined Permissions
    const permissions = [
      // GLOBAL
      { app: 'GLOBAL', module: 'all', action: 'manage', name: 'Full Super Admin Access', desc: 'Manage all resources and actions across all systems' },
      { app: 'GLOBAL', module: 'roles', action: 'read', name: 'View Roles', desc: 'View roles and assigned permissions' },
      { app: 'GLOBAL', module: 'roles', action: 'create', name: 'Create Roles', desc: 'Create new custom roles' },
      { app: 'GLOBAL', module: 'roles', action: 'update', name: 'Update Roles', desc: 'Update role details' },
      { app: 'GLOBAL', module: 'roles', action: 'delete', name: 'Delete Roles', desc: 'Delete custom roles' },
      { app: 'GLOBAL', module: 'roles', action: 'manage', name: 'Manage Role Permissions', desc: 'Assign and revoke permissions from roles' },
      { app: 'GLOBAL', module: 'users', action: 'read', name: 'View Users', desc: 'View system user accounts' },
      { app: 'GLOBAL', module: 'users', action: 'create', name: 'Create Users', desc: 'Create new user accounts' },
      { app: 'GLOBAL', module: 'users', action: 'update', name: 'Update Users', desc: 'Update user account information' },
      { app: 'GLOBAL', module: 'users', action: 'delete', name: 'Delete Users', desc: 'Delete user accounts' },
      { app: 'GLOBAL', module: 'users', action: 'manage', name: 'Assign User Roles', desc: 'Assign and change user roles' },
      { app: 'GLOBAL', module: 'audit', action: 'read', name: 'View Audit Logs', desc: 'View system audit trails and logs' },

      // HRMS
      { app: 'HRMS', module: 'app.hrms', action: 'read', name: 'Access HRMS Application', desc: 'Grants access to the HRMS application' },
      { app: 'HRMS', module: 'employee', action: 'read', name: 'View Employees', desc: 'View employee profiles and lists' },
      { app: 'HRMS', module: 'employee', action: 'create', name: 'Create Employees', desc: 'Add new employee records' },
      { app: 'HRMS', module: 'employee', action: 'update', name: 'Update Employees', desc: 'Edit employee details' },
      { app: 'HRMS', module: 'employee', action: 'delete', name: 'Delete Employees', desc: 'Delete employee records' },

      { app: 'HRMS', module: 'attendance', action: 'read', name: 'View Attendance', desc: 'View attendance records and rosters' },
      { app: 'HRMS', module: 'attendance', action: 'create', name: 'Record Attendance / Shifts', desc: 'Check in/out and manage shifts' },
      { app: 'HRMS', module: 'attendance', action: 'update', name: 'Edit Attendance / Shifts', desc: 'Modify attendance logs and shift rosters' },
      { app: 'HRMS', module: 'attendance', action: 'delete', name: 'Delete Shifts / Logs', desc: 'Remove shifts and attendance records' },
      { app: 'HRMS', module: 'attendance', action: 'import', name: 'Import Attendance', desc: 'Bulk import attendance from CSV' },
      { app: 'HRMS', module: 'attendance', action: 'export', name: 'Export Attendance', desc: 'Export attendance records to CSV' },

      { app: 'HRMS', module: 'shift_roster', action: 'read', name: 'View Shift Schedules', desc: 'View HOD shift schedules and department rosters' },
      { app: 'HRMS', module: 'shift_roster', action: 'create', name: 'Create Shift Rosters', desc: 'Schedule and allocate department shifts' },
      { app: 'HRMS', module: 'shift_roster', action: 'update', name: 'Update Shift Rosters', desc: 'Modify and change department shift allocations' },
      { app: 'HRMS', module: 'shift_roster', action: 'delete', name: 'Delete Shift Rosters', desc: 'Remove shift allocations' },

      { app: 'HRMS', module: 'shift', action: 'read', name: 'View Shifts', desc: 'View shift timings and master list' },
      { app: 'HRMS', module: 'shift', action: 'create', name: 'Create Shift Master', desc: 'Create shift definitions and timings' },
      { app: 'HRMS', module: 'shift', action: 'update', name: 'Update Shift Master', desc: 'Update shift definitions and timings' },
      { app: 'HRMS', module: 'shift', action: 'delete', name: 'Delete Shift Master', desc: 'Delete shift definitions' },

      { app: 'HRMS', module: 'leave', action: 'read', name: 'View Leaves', desc: 'View leave applications and balances' },
      { app: 'HRMS', module: 'leave', action: 'create', name: 'Apply Leaves', desc: 'Submit leave applications' },
      { app: 'HRMS', module: 'leave', action: 'update', name: 'Edit Leave Applications', desc: 'Update leave requests' },
      { app: 'HRMS', module: 'leave', action: 'delete', name: 'Delete Leave Applications', desc: 'Remove leave requests' },
      { app: 'HRMS', module: 'leave', action: 'approve', name: 'Approve Leaves', desc: 'Approve pending employee leave requests' },
      { app: 'HRMS', module: 'leave', action: 'reject', name: 'Reject Leaves', desc: 'Reject employee leave requests' },
      { app: 'HRMS', module: 'leave', action: 'manage', name: 'Manage Leaves', desc: 'Full manage leave system' },

      { app: 'HRMS', module: 'leave_master', action: 'read', name: 'View Leave Masters', desc: 'View department leave quotas and policies' },
      { app: 'HRMS', module: 'leave_master', action: 'create', name: 'Create Leave Master', desc: 'Create department leave policies' },
      { app: 'HRMS', module: 'leave_master', action: 'update', name: 'Update Leave Master', desc: 'Update department leave quotas' },
      { app: 'HRMS', module: 'leave_master', action: 'delete', name: 'Delete Leave Master', desc: 'Delete department leave policies' },

      { app: 'HRMS', module: 'holiday', action: 'read', name: 'View Holidays', desc: 'View official company holiday calendar' },
      { app: 'HRMS', module: 'holiday', action: 'create', name: 'Create Holiday', desc: 'Add new holiday dates' },
      { app: 'HRMS', module: 'holiday', action: 'update', name: 'Update Holiday', desc: 'Update holiday names and dates' },
      { app: 'HRMS', module: 'holiday', action: 'delete', name: 'Delete Holiday', desc: 'Delete holiday entries' },
      { app: 'HRMS', module: 'holiday', action: 'manage', name: 'Manage Holidays', desc: 'Full manage holiday calendar' },

      { app: 'HRMS', module: 'recruitment', action: 'read', name: 'View Recruitment', desc: 'View job requisitions and candidates' },
      { app: 'HRMS', module: 'recruitment', action: 'create', name: 'Create Recruitment', desc: 'Add job requisitions and candidates' },
      { app: 'HRMS', module: 'recruitment', action: 'update', name: 'Edit Recruitment', desc: 'Update requisitions, candidates and interviews' },
      { app: 'HRMS', module: 'recruitment', action: 'delete', name: 'Delete Recruitment', desc: 'Delete job requisitions or interview rounds' },

      { app: 'HRMS', module: 'onboarding', action: 'read', name: 'View Onboarding', desc: 'View onboarding documents and schedules' },
      { app: 'HRMS', module: 'onboarding', action: 'create', name: 'Create Onboarding', desc: 'Upload documents and create induction schedules' },
      { app: 'HRMS', module: 'onboarding', action: 'update', name: 'Update Onboarding', desc: 'Verify documents and update system access' },
      { app: 'HRMS', module: 'onboarding', action: 'delete', name: 'Delete Onboarding', desc: 'Delete onboarding items' },

      { app: 'HRMS', module: 'performance', action: 'read', name: 'View Performance', desc: 'View appraisal cycles, goals, and reviews' },
      { app: 'HRMS', module: 'performance', action: 'create', name: 'Create Performance Goals/Cycles', desc: 'Create appraisal cycles and goals' },
      { app: 'HRMS', module: 'performance', action: 'update', name: 'Update Performance Reviews', desc: 'Submit and edit reviews and ratings' },
      { app: 'HRMS', module: 'performance', action: 'delete', name: 'Delete Performance Data', desc: 'Delete goals or appraisal cycles' },

      { app: 'HRMS', module: 'training', action: 'read', name: 'View Training', desc: 'View training records and training types' },
      { app: 'HRMS', module: 'training', action: 'create', name: 'Create Training', desc: 'Add training records and types' },
      { app: 'HRMS', module: 'training', action: 'update', name: 'Update Training', desc: 'Edit training records and types' },
      { app: 'HRMS', module: 'training', action: 'delete', name: 'Delete Training', desc: 'Remove training records and types' },

      { app: 'HRMS', module: 'payroll', action: 'read', name: 'View Payroll', desc: 'View salary structures, declarations and payslips' },
      { app: 'HRMS', module: 'payroll', action: 'create', name: 'Create Payroll Records', desc: 'Create salary structures and loans' },
      { app: 'HRMS', module: 'payroll', action: 'update', name: 'Update Payroll Records', desc: 'Edit salary structures and tax declarations' },
      { app: 'HRMS', module: 'payroll', action: 'delete', name: 'Delete Payroll Data', desc: 'Delete payroll records' },
      { app: 'HRMS', module: 'payroll', action: 'approve', name: 'Approve / Process Payroll', desc: 'Approve and process monthly payroll runs' },

      { app: 'HRMS', module: 'exit', action: 'read', name: 'View Exit Processes', desc: 'View resignation, clearances and settlements' },
      { app: 'HRMS', module: 'exit', action: 'create', name: 'Initiate Exit Process', desc: 'Initiate resignation or termination' },
      { app: 'HRMS', module: 'exit', action: 'update', name: 'Update Exit Clearances', desc: 'Clear departmental tasks and update F&F' },
      { app: 'HRMS', module: 'exit', action: 'delete', name: 'Delete Exit Records', desc: 'Delete exit processes' },

      { app: 'HRMS', module: 'department', action: 'read', name: 'View Departments', desc: 'View department master list' },
      { app: 'HRMS', module: 'department', action: 'create', name: 'Create Department', desc: 'Add new department' },
      { app: 'HRMS', module: 'department', action: 'update', name: 'Edit Department', desc: 'Modify department details' },
      { app: 'HRMS', module: 'department', action: 'delete', name: 'Delete Department', desc: 'Delete departments' },

      // GATEPASS
      { app: 'GATEPASS', module: 'app.gatepass', action: 'read', name: 'Access Gate Pass Application', desc: 'Grants access to the Gate Pass application' },
      { app: 'GATEPASS', module: 'gatepass', action: 'read', name: 'View Gate Passes', desc: 'View inward and outward gate passes' },
      { app: 'GATEPASS', module: 'gatepass', action: 'create', name: 'Create Gate Pass', desc: 'Generate new gate passes' },
      { app: 'GATEPASS', module: 'gatepass', action: 'update', name: 'Update Gate Pass', desc: 'Record timeout, link PO/GRN' },
      { app: 'GATEPASS', module: 'gatepass', action: 'delete', name: 'Delete Gate Pass', desc: 'Cancel or remove gate pass records' },
      { app: 'GATEPASS', module: 'gatepass', action: 'approve', name: 'Approve Gate Pass', desc: 'Approve security entry/exit' },
      { app: 'GATEPASS', module: 'gatepass', action: 'reject', name: 'Reject Gate Pass', desc: 'Reject gate pass entry' },
      { app: 'GATEPASS', module: 'gatepass', action: 'export', name: 'Export Gate Pass PDF', desc: 'Download Gate Pass PDF documents' },

      { app: 'GATEPASS', module: 'pass_category', action: 'read', name: 'View Pass Categories', desc: 'View pass category master' },
      { app: 'GATEPASS', module: 'pass_category', action: 'create', name: 'Create Pass Category', desc: 'Add new pass categories' },
      { app: 'GATEPASS', module: 'pass_category', action: 'update', name: 'Edit Pass Category', desc: 'Update pass categories' },
      { app: 'GATEPASS', module: 'pass_category', action: 'delete', name: 'Delete Pass Category', desc: 'Remove pass categories' },

      { app: 'GATEPASS', module: 'visitor', action: 'read', name: 'View Visitors', desc: 'View visitor logs and entry history' },
      { app: 'GATEPASS', module: 'visitor', action: 'create', name: 'Create Visitor Pass', desc: 'Issue visitor gate pass' },
      { app: 'GATEPASS', module: 'visitor', action: 'update', name: 'Update Visitor Pass', desc: 'Record visitor departure / checkout' },
      { app: 'GATEPASS', module: 'visitor', action: 'delete', name: 'Delete Visitor Pass', desc: 'Delete visitor pass' },

      { app: 'GATEPASS', module: 'supplier', action: 'read', name: 'View Suppliers', desc: 'View supplier master' },
      { app: 'GATEPASS', module: 'supplier', action: 'create', name: 'Create Supplier', desc: 'Add new supplier' },
      { app: 'GATEPASS', module: 'supplier', action: 'update', name: 'Edit Supplier', desc: 'Update supplier information' },
      { app: 'GATEPASS', module: 'supplier', action: 'delete', name: 'Delete Supplier', desc: 'Delete supplier records' },

      { app: 'GATEPASS', module: 'vendor', action: 'read', name: 'View Vendors', desc: 'View vendor master' },
      { app: 'GATEPASS', module: 'vendor', action: 'create', name: 'Create Vendor', desc: 'Add new vendor' },
      { app: 'GATEPASS', module: 'vendor', action: 'update', name: 'Edit Vendor', desc: 'Update vendor records' },
      { app: 'GATEPASS', module: 'vendor', action: 'delete', name: 'Delete Vendor', desc: 'Delete vendor records' },

      { app: 'GATEPASS', module: 'customer', action: 'read', name: 'View Customers', desc: 'View customer master' },
      { app: 'GATEPASS', module: 'customer', action: 'create', name: 'Create Customer', desc: 'Add new customer' },
      { app: 'GATEPASS', module: 'customer', action: 'update', name: 'Edit Customer', desc: 'Update customer records' },
      { app: 'GATEPASS', module: 'customer', action: 'delete', name: 'Delete Customer', desc: 'Delete customer records' },

      { app: 'GATEPASS', module: 'bank', action: 'read', name: 'View Banks', desc: 'View bank master' },
      { app: 'GATEPASS', module: 'bank', action: 'create', name: 'Create Bank', desc: 'Add new bank' },
      { app: 'GATEPASS', module: 'bank', action: 'update', name: 'Edit Bank', desc: 'Update bank information' },
      { app: 'GATEPASS', module: 'bank', action: 'delete', name: 'Delete Bank', desc: 'Delete bank records' },

      { app: 'GATEPASS', module: 'product', action: 'read', name: 'View Products', desc: 'View product master' },
      { app: 'GATEPASS', module: 'product', action: 'create', name: 'Create Product', desc: 'Add new product' },
      { app: 'GATEPASS', module: 'product', action: 'update', name: 'Edit Product', desc: 'Update product records' },
      { app: 'GATEPASS', module: 'product', action: 'delete', name: 'Delete Product', desc: 'Delete product records' },

      { app: 'GATEPASS', module: 'product_category', action: 'read', name: 'View Product Categories', desc: 'View product category master' },
      { app: 'GATEPASS', module: 'product_category', action: 'create', name: 'Create Product Category', desc: 'Add product category' },
      { app: 'GATEPASS', module: 'product_category', action: 'update', name: 'Edit Product Category', desc: 'Update product category' },
      { app: 'GATEPASS', module: 'product_category', action: 'delete', name: 'Delete Product Category', desc: 'Delete product category' },

      { app: 'GATEPASS', module: 'product_sub_category', action: 'read', name: 'View Product Sub-Categories', desc: 'View sub-category master' },
      { app: 'GATEPASS', module: 'product_sub_category', action: 'create', name: 'Create Product Sub-Category', desc: 'Add sub-category' },
      { app: 'GATEPASS', module: 'product_sub_category', action: 'update', name: 'Edit Product Sub-Category', desc: 'Update sub-category' },
      { app: 'GATEPASS', module: 'product_sub_category', action: 'delete', name: 'Delete Product Sub-Category', desc: 'Delete sub-category' },

      { app: 'GATEPASS', module: 'uom', action: 'read', name: 'View UOMs', desc: 'View Unit of Measurement master' },
      { app: 'GATEPASS', module: 'uom', action: 'create', name: 'Create UOM', desc: 'Add Unit of Measurement' },
      { app: 'GATEPASS', module: 'uom', action: 'update', name: 'Edit UOM', desc: 'Update Unit of Measurement' },
      { app: 'GATEPASS', module: 'uom', action: 'delete', name: 'Delete UOM', desc: 'Delete Unit of Measurement' },

      { app: 'GATEPASS', module: 'packing_material', action: 'read', name: 'View Packing Materials', desc: 'View packing materials master' },
      { app: 'GATEPASS', module: 'packing_material', action: 'create', name: 'Create Packing Material', desc: 'Add packing material' },
      { app: 'GATEPASS', module: 'packing_material', action: 'update', name: 'Edit Packing Material', desc: 'Update packing material' },
      { app: 'GATEPASS', module: 'packing_material', action: 'delete', name: 'Delete Packing Material', desc: 'Delete packing material' },

      { app: 'GATEPASS', module: 'qc_specification', action: 'read', name: 'View QC Specifications', desc: 'View QC specification master' },
      { app: 'GATEPASS', module: 'qc_specification', action: 'create', name: 'Create QC Specification', desc: 'Add QC specification' },
      { app: 'GATEPASS', module: 'qc_specification', action: 'update', name: 'Edit QC Specification', desc: 'Update QC specification' },
      { app: 'GATEPASS', module: 'qc_specification', action: 'delete', name: 'Delete QC Specification', desc: 'Delete QC specification' },

      { app: 'GATEPASS', module: 'storage_location', action: 'read', name: 'View Storage Locations', desc: 'View warehouse location master' },
      { app: 'GATEPASS', module: 'storage_location', action: 'create', name: 'Create Storage Location', desc: 'Add warehouse storage location' },
      { app: 'GATEPASS', module: 'storage_location', action: 'update', name: 'Edit Storage Location', desc: 'Update warehouse location' },
      { app: 'GATEPASS', module: 'storage_location', action: 'delete', name: 'Delete Storage Location', desc: 'Delete storage location' },
    ];

    // Upsert all permissions with standard action-module name (e.g. create-attendance, delete-user, update-product)
    for (const p of permissions) {
      const codeName = `${p.action}-${p.module}`;
      await pool.query(
        `INSERT INTO permissions (application, module, action, name, description, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (application, module, action)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, "updatedAt" = NOW()`,
        [p.app, p.module, p.action, codeName, p.desc]
      );
    }
    console.log(`✅ Upserted ${permissions.length} granular permissions.`);

    // Fetch all permission rows
    const allPermsRes = await pool.query(`SELECT id, application, module, action FROM permissions`);
    const permMap = new Map<string, string>(); // "app:module:action" -> id
    for (const row of allPermsRes.rows) {
      permMap.set(`${row.application}:${row.module}:${row.action}`, row.id);
    }

    // 2. Roles Definition
    const roles = [
      {
        name: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        description: 'Complete cross-system administrator with full access to HRMS, GatePass, Roles and User Management',
        isSystem: true,
      },
      {
        name: 'HR_MANAGER',
        displayName: 'HR Manager',
        description: 'Complete HRMS management access (Employees, Attendance, Leave, Recruitment, Payroll, etc.)',
        isSystem: true,
      },
      {
        name: 'SECURITY',
        displayName: 'Security Officer',
        description: 'Gate Pass operations, visitor management, supplier/vendor tracking',
        isSystem: true,
      },
      {
        name: 'EMPLOYEE',
        displayName: 'Employee',
        description: 'Standard employee portal access for attendance, leave submission, and payslip viewing',
        isSystem: true,
      },
    ];

    const roleIdMap = new Map<string, string>();

    for (const r of roles) {
      const res = await pool.query(
        `INSERT INTO roles (name, "displayName", description, "isSystem", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (name)
         DO UPDATE SET "displayName" = EXCLUDED."displayName", description = EXCLUDED.description, "updatedAt" = NOW()
         RETURNING id`,
        [r.name, r.displayName, r.description, r.isSystem]
      );
      roleIdMap.set(r.name, res.rows[0].id);
    }
    console.log(`✅ Upserted system roles.`);

    // 3. Assign Role Permissions
    // Helper function to link permissions to a role
    async function assignPermissions(roleName: string, permKeys: string[]) {
      const roleId = roleIdMap.get(roleName);
      if (!roleId) return;

      // Clear existing permissions for clean sync
      await pool.query(`DELETE FROM role_permissions WHERE "roleId" = $1`, [roleId]);

      for (const key of permKeys) {
        const permId = permMap.get(key);
        if (permId) {
          await pool.query(
            `INSERT INTO role_permissions ("roleId", "permissionId")
             VALUES ($1, $2)
             ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
            [roleId, permId]
          );
        }
      }
    }

    // A) SUPER_ADMIN: ALL permissions
    const superAdminPermKeys = Array.from(permMap.keys());
    await assignPermissions('SUPER_ADMIN', superAdminPermKeys);
    console.log(`✅ Assigned ${superAdminPermKeys.length} permissions to SUPER_ADMIN.`);

    // B) HR_MANAGER: All HRMS permissions + app.hrms + audit + users.read
    const hrManagerPermKeys = Array.from(permMap.keys()).filter(
      (k) => k.startsWith('HRMS:') || k === 'GLOBAL:audit:read' || k === 'GLOBAL:users:read'
    );
    await assignPermissions('HR_MANAGER', hrManagerPermKeys);
    console.log(`✅ Assigned ${hrManagerPermKeys.length} permissions to HR_MANAGER.`);

    // C) SECURITY: All GatePass permissions + app.gatepass + audit
    const securityPermKeys = Array.from(permMap.keys()).filter(
      (k) => k.startsWith('GATEPASS:') || k === 'GLOBAL:audit:read'
    );
    await assignPermissions('SECURITY', securityPermKeys);
    console.log(`✅ Assigned ${securityPermKeys.length} permissions to SECURITY.`);

    // D) EMPLOYEE: Basic HRMS self-service
    const employeePermKeys = [
      'HRMS:app.hrms:read',
      'HRMS:employee:read',
      'HRMS:attendance:read',
      'HRMS:attendance:create',
      'HRMS:leave:read',
      'HRMS:leave:create',
      'HRMS:payroll:read',
      'HRMS:performance:read',
      'HRMS:training:read',
    ];
    await assignPermissions('EMPLOYEE', employeePermKeys);
    console.log(`✅ Assigned ${employeePermKeys.length} permissions to EMPLOYEE.`);

    // 4. Upsert Users and link to Roles
    const users = [
      {
        email: 'admin@aspino.com',
        name: 'Aspino Super Admin',
        password: 'admin123',
        roleName: 'SUPER_ADMIN',
        legacyRole: 'ADMIN',
      },
      {
        email: 'hr@aspino.com',
        name: 'Aspino HR Manager',
        password: 'Hr@123',
        roleName: 'HR_MANAGER',
        legacyRole: 'HR',
      },
      {
        email: 'security@aspino.com',
        name: 'Security Officer',
        password: 'security123',
        roleName: 'SECURITY',
        legacyRole: 'USER',
      },
      {
        email: 'employee@aspino.com',
        name: 'Aspino Employee',
        password: 'employee123',
        roleName: 'EMPLOYEE',
        legacyRole: 'EMPLOYEE',
      },
    ];

    for (const u of users) {
      const roleId = roleIdMap.get(u.roleName);
      const hashedPassword = await bcrypt.hash(u.password, 10);

      await pool.query(
        `INSERT INTO "User" (id, name, email, password, role, "roleId", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, "roleId" = EXCLUDED."roleId"`,
        [u.name, u.email, hashedPassword, u.legacyRole, roleId]
      );
    }
    console.log(`✅ Upserted demo users with linked roleIds.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedRBAC();
