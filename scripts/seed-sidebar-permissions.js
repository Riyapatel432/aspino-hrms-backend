const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const sidebarPermissions = [
  // ─── Universal & Core ────────────────────────────────────────────────────────
  { name: 'sidebar-dashboard', action: 'sidebar', module: 'dashboard', application: 'GLOBAL', description: 'View Dashboard in sidebar' },
  { name: 'sidebar-roles', action: 'sidebar', module: 'roles', application: 'GLOBAL', description: 'View Roles & Permissions in sidebar' },
  { name: 'sidebar-activity-logs', action: 'sidebar', module: 'activity_logs', application: 'GLOBAL', description: 'View Activity Logs in sidebar' },

  // ─── GatePass & ERP Masters / Modules ───────────────────────────────────────
  { name: 'sidebar-users', action: 'sidebar', module: 'users', application: 'GATEPASS', description: 'View Users in sidebar' },
  { name: 'sidebar-accounts', action: 'sidebar', module: 'accounts', application: 'GATEPASS', description: 'View Chart of Accounts in sidebar' },
  { name: 'sidebar-vouchers', action: 'sidebar', module: 'vouchers', application: 'GATEPASS', description: 'View Voucher Engine in sidebar' },
  { name: 'sidebar-customer-ledger', action: 'sidebar', module: 'customer_ledger', application: 'GATEPASS', description: 'View Customer Ledger in sidebar' },
  { name: 'sidebar-supplier-ledger', action: 'sidebar', module: 'supplier_ledger', application: 'GATEPASS', description: 'View Supplier Ledger in sidebar' },
  { name: 'sidebar-financial-reports', action: 'sidebar', module: 'financial_reports', application: 'GATEPASS', description: 'View Financial Statements in sidebar' },
  { name: 'sidebar-product-categories', action: 'sidebar', module: 'product_categories', application: 'GATEPASS', description: 'View Product Categories in sidebar' },
  { name: 'sidebar-product-sub-categories', action: 'sidebar', module: 'product_sub_categories', application: 'GATEPASS', description: 'View Product Sub-Categories in sidebar' },
  { name: 'sidebar-uoms', action: 'sidebar', module: 'uoms', application: 'GATEPASS', description: 'View UOM Master in sidebar' },
  { name: 'sidebar-products', action: 'sidebar', module: 'products', application: 'GATEPASS', description: 'View Product Master in sidebar' },
  { name: 'sidebar-packing-materials', action: 'sidebar', module: 'packing_materials', application: 'GATEPASS', description: 'View Packing Materials in sidebar' },
  { name: 'sidebar-qc-specifications', action: 'sidebar', module: 'qc_specifications', application: 'GATEPASS', description: 'View QC Specifications in sidebar' },
  { name: 'sidebar-storage-locations', action: 'sidebar', module: 'storage_locations', application: 'GATEPASS', description: 'View Storage Locations in sidebar' },
  { name: 'sidebar-pass-categories', action: 'sidebar', module: 'pass_categories', application: 'GATEPASS', description: 'View Pass Categories in sidebar' },
  { name: 'sidebar-banks', action: 'sidebar', module: 'banks', application: 'GATEPASS', description: 'View Bank Master in sidebar' },
  { name: 'sidebar-vendors', action: 'sidebar', module: 'vendors', application: 'GATEPASS', description: 'View Vendor in sidebar' },
  { name: 'sidebar-customers', action: 'sidebar', module: 'customers', application: 'GATEPASS', description: 'View Customer Master in sidebar' },
  { name: 'sidebar-suppliers', action: 'sidebar', module: 'suppliers', application: 'GATEPASS', description: 'View Suppliers in sidebar' },
  { name: 'sidebar-gatepass', action: 'sidebar', module: 'gatepass', application: 'GATEPASS', description: 'View Gate Pass in sidebar' },

  // ─── HRMS Modules ───────────────────────────────────────────────────────────
  { name: 'sidebar-departments', action: 'sidebar', module: 'departments', application: 'HRMS', description: 'View Department Master in sidebar' },
  { name: 'sidebar-financial-year', action: 'sidebar', module: 'financial_year', application: 'HRMS', description: 'View Financial Year Master in sidebar' },
  { name: 'sidebar-training-type', action: 'sidebar', module: 'training_type', application: 'HRMS', description: 'View Training Type in sidebar' },
  { name: 'sidebar-leave-master', action: 'sidebar', module: 'leave_master', application: 'HRMS', description: 'View Leave Master in sidebar' },
  { name: 'sidebar-interview-rounds', action: 'sidebar', module: 'interview_rounds', application: 'HRMS', description: 'View Interview Round Master in sidebar' },
  { name: 'sidebar-recruitment', action: 'sidebar', module: 'recruitment', application: 'HRMS', description: 'View Recruitment in sidebar' },
  { name: 'sidebar-onboarding', action: 'sidebar', module: 'onboarding', application: 'HRMS', description: 'View Onboarding in sidebar' },
  { name: 'sidebar-exit', action: 'sidebar', module: 'exit', application: 'HRMS', description: 'View Exit Process in sidebar' },
  { name: 'sidebar-attendance-leave', action: 'sidebar', module: 'attendance_leave', application: 'HRMS', description: 'View Attendance & Leave in sidebar' },
  { name: 'sidebar-performance-training', action: 'sidebar', module: 'performance_training', application: 'HRMS', description: 'View Performance & Training in sidebar' },
  { name: 'sidebar-salary-structures', action: 'sidebar', module: 'salary_structures', application: 'HRMS', description: 'View Salary Structures in sidebar' },
  { name: 'sidebar-hra-tax', action: 'sidebar', module: 'hra_tax', application: 'HRMS', description: 'View HRA & Tax Exemption in sidebar' },
  { name: 'sidebar-loans', action: 'sidebar', module: 'loans', application: 'HRMS', description: 'View Loans & Advances in sidebar' },
  { name: 'sidebar-monthly-run', action: 'sidebar', module: 'monthly_run', application: 'HRMS', description: 'View Monthly Payroll Run in sidebar' },
  { name: 'sidebar-payslips', action: 'sidebar', module: 'payslips', application: 'HRMS', description: 'View Payslips & Self-Service in sidebar' },
  { name: 'sidebar-reports', action: 'sidebar', module: 'reports', application: 'HRMS', description: 'View Reports & Form 16 in sidebar' },
];

async function seedSidebarPermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database...');

    // 1. Insert or update sidebar permissions using (application, module, action) conflict target
    let createdCount = 0;
    for (const p of sidebarPermissions) {
      await pool.query(
        `INSERT INTO permissions (id, name, action, module, application, description, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (application, module, action) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           "updatedAt" = NOW()`,
        [p.name, p.action, p.module, p.application, p.description]
      );
      createdCount++;
    }
    console.log(`✅ Upserted ${createdCount} sidebar permissions.`);

    // 2. Fetch all permissions now
    const allPermsRes = await pool.query('SELECT id, name, application, module, action FROM permissions');
    const allPerms = allPermsRes.rows;
    console.log(`Total permissions in system now: ${allPerms.length}`);

    // 3. Assign all permissions to all active roles
    const rolesRes = await pool.query('SELECT id, name FROM roles');
    for (const r of rolesRes.rows) {
      let roleAssigned = 0;
      for (const p of allPerms) {
        await pool.query(
          `INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [r.id, p.id]
        );
        roleAssigned++;
      }
      console.log(`✅ Granted all ${roleAssigned} permissions to role: ${r.name}`);
    }

    console.log('\n🎉 Successfully created all sidebar permissions and linked them to roles!');
  } catch (err) {
    console.error('Error seeding sidebar permissions:', err);
  } finally {
    await pool.end();
  }
}

seedSidebarPermissions();
