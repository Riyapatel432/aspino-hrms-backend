const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const payrollGranularPermissions = [
  // ─── 1. Salary Structures ──────────────────────────────────────────────────
  { name: 'read-salary-structures', action: 'read', module: 'salary_structures', application: 'HRMS', description: 'View salary matrix and employee structures' },
  { name: 'create-salary-structures', action: 'create', module: 'salary_structures', application: 'HRMS', description: 'Create and setup salary structures, import CSV' },
  { name: 'update-salary-structures', action: 'update', module: 'salary_structures', application: 'HRMS', description: 'Batch update salary matrix and edit structures' },
  { name: 'delete-salary-structures', action: 'delete', module: 'salary_structures', application: 'HRMS', description: 'Delete employee salary structures' },
  { name: 'sidebar-salary-structures', action: 'sidebar', module: 'salary_structures', application: 'HRMS', description: 'View Salary Structures in sidebar' },

  // ─── 2. HRA & Tax Exemption ────────────────────────────────────────────────
  { name: 'read-hra-tax', action: 'read', module: 'hra_tax', application: 'HRMS', description: 'View rent receipts and tax declarations' },
  { name: 'create-hra-tax', action: 'create', module: 'hra_tax', application: 'HRMS', description: 'Submit rent receipts and tax declarations' },
  { name: 'update-hra-tax', action: 'update', module: 'hra_tax', application: 'HRMS', description: 'Verify and approve rent receipts' },
  { name: 'delete-hra-tax', action: 'delete', module: 'hra_tax', application: 'HRMS', description: 'Delete tax declarations or receipts' },
  { name: 'sidebar-hra-tax', action: 'sidebar', module: 'hra_tax', application: 'HRMS', description: 'View HRA & Tax in sidebar' },

  // ─── 3. Loans & Advances ───────────────────────────────────────────────────
  { name: 'read-loans', action: 'read', module: 'loans', application: 'HRMS', description: 'View loans and advances' },
  { name: 'create-loans', action: 'create', module: 'loans', application: 'HRMS', description: 'Create and apply for employee loans' },
  { name: 'update-loans', action: 'update', module: 'loans', application: 'HRMS', description: 'Record manual repayments on loans' },
  { name: 'delete-loans', action: 'delete', module: 'loans', application: 'HRMS', description: 'Delete or cancel loans' },
  { name: 'sidebar-loans', action: 'sidebar', module: 'loans', application: 'HRMS', description: 'View Loans & Advances in sidebar' },

  // ─── 4. Monthly Payroll Run ────────────────────────────────────────────────
  { name: 'read-monthly-run', action: 'read', module: 'monthly_run', application: 'HRMS', description: 'View monthly payroll runs' },
  { name: 'create-monthly-run', action: 'create', module: 'monthly_run', application: 'HRMS', description: 'Initiate and run monthly payroll' },
  { name: 'update-monthly-run', action: 'update', module: 'monthly_run', application: 'HRMS', description: 'Adjust monthly payroll calculation' },
  { name: 'approve-monthly-run', action: 'approve', module: 'monthly_run', application: 'HRMS', description: 'Approve and finalize monthly payroll batches' },
  { name: 'sidebar-monthly-run', action: 'sidebar', module: 'monthly_run', application: 'HRMS', description: 'View Monthly Run in sidebar' },

  // ─── 5. Payslips & Self-Service ────────────────────────────────────────────
  { name: 'read-payslips', action: 'read', module: 'payslips', application: 'HRMS', description: 'View and download payslips' },
  { name: 'create-payslips', action: 'create', module: 'payslips', application: 'HRMS', description: 'Generate payslips' },
  { name: 'update-payslips', action: 'update', module: 'payslips', application: 'HRMS', description: 'Update payslip records' },
  { name: 'delete-payslips', action: 'delete', module: 'payslips', application: 'HRMS', description: 'Delete payslips' },
  { name: 'sidebar-payslips', action: 'sidebar', module: 'payslips', application: 'HRMS', description: 'View Payslips in sidebar' },

  // ─── 6. Reports & Form 16 ──────────────────────────────────────────────────
  { name: 'read-reports', action: 'read', module: 'reports', application: 'HRMS', description: 'View payroll reports and statutory summaries' },
  { name: 'export-reports', action: 'export', module: 'reports', application: 'HRMS', description: 'Export bank transfer files, PF ECR, ESI, PT, and Form 16' },
  { name: 'sidebar-reports', action: 'sidebar', module: 'reports', application: 'HRMS', description: 'View Reports in sidebar' },
];

async function seedPayrollGranularPermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database...');

    let upsertedCount = 0;
    for (const p of payrollGranularPermissions) {
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
    console.log(`✅ Upserted ${upsertedCount} Granular Payroll permissions.`);

    // Fetch all inserted permissions
    const permsRes = await pool.query(
      `SELECT id, name, application, module, action FROM permissions
       WHERE module IN ('salary_structures', 'hra_tax', 'loans', 'monthly_run', 'payslips', 'reports')`
    );
    const payrollPerms = permsRes.rows;
    console.log(`Found ${payrollPerms.length} granular payroll permissions in DB.`);

    // ONLY assign to SUPER_ADMIN and ADMIN by default
    const rolesRes = await pool.query("SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN')");
    console.log(`Found ${rolesRes.rows.length} admin roles to link.`);

    for (const r of rolesRes.rows) {
      let roleAssigned = 0;
      for (const p of payrollPerms) {
        await pool.query(
          `INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [r.id, p.id]
        );
        roleAssigned++;
      }
      console.log(`✅ Linked ${roleAssigned} granular payroll permissions to admin role: ${r.name}`);
    }

    console.log('\n🎉 Successfully seeded granular Payroll permissions!');
  } catch (err) {
    console.error('Error seeding granular Payroll permissions:', err);
  } finally {
    await pool.end();
  }
}

seedPayrollGranularPermissions();
