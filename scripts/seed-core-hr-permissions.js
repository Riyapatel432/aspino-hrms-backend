const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const coreHRPermissions = [
  // ─── Recruitment Main Module ────────────────────────────────────────────────
  { name: 'read-recruitment', action: 'read', module: 'recruitment', application: 'HRMS', description: 'View Recruitment module' },
  { name: 'create-recruitment', action: 'create', module: 'recruitment', application: 'HRMS', description: 'Create Recruitment records' },
  { name: 'update-recruitment', action: 'update', module: 'recruitment', application: 'HRMS', description: 'Update Recruitment records' },
  { name: 'delete-recruitment', action: 'delete', module: 'recruitment', application: 'HRMS', description: 'Delete Recruitment records' },
  { name: 'sidebar-recruitment', action: 'sidebar', module: 'recruitment', application: 'HRMS', description: 'View Recruitment in sidebar' },

  // ─── Recruitment Sub-Modules (Requisitions, Candidates, Interviews, Offers) ──
  { name: 'read-job-requisitions', action: 'read', module: 'job_requisitions', application: 'HRMS', description: 'View Job Requisitions' },
  { name: 'create-job-requisitions', action: 'create', module: 'job_requisitions', application: 'HRMS', description: 'Create Job Requisitions' },
  { name: 'update-job-requisitions', action: 'update', module: 'job_requisitions', application: 'HRMS', description: 'Update Job Requisitions' },
  { name: 'delete-job-requisitions', action: 'delete', module: 'job_requisitions', application: 'HRMS', description: 'Delete Job Requisitions' },

  { name: 'read-candidates', action: 'read', module: 'candidates', application: 'HRMS', description: 'View Candidates & Sourcing' },
  { name: 'create-candidates', action: 'create', module: 'candidates', application: 'HRMS', description: 'Create / Source Candidates' },
  { name: 'update-candidates', action: 'update', module: 'candidates', application: 'HRMS', description: 'Update Candidate status' },
  { name: 'delete-candidates', action: 'delete', module: 'candidates', application: 'HRMS', description: 'Delete Candidates' },

  { name: 'read-interview-scheduling', action: 'read', module: 'interview_scheduling', application: 'HRMS', description: 'View Interview Scheduling & Feedback' },
  { name: 'create-interview-scheduling', action: 'create', module: 'interview_scheduling', application: 'HRMS', description: 'Schedule Interviews' },
  { name: 'update-interview-scheduling', action: 'update', module: 'interview_scheduling', application: 'HRMS', description: 'Update Interviews & Feedback' },
  { name: 'delete-interview-scheduling', action: 'delete', module: 'interview_scheduling', application: 'HRMS', description: 'Delete Interview Schedules' },

  { name: 'read-offer-letters', action: 'read', module: 'offer_letters', application: 'HRMS', description: 'View Offer Letters' },
  { name: 'create-offer-letters', action: 'create', module: 'offer_letters', application: 'HRMS', description: 'Generate Offer Letters' },
  { name: 'update-offer-letters', action: 'update', module: 'offer_letters', application: 'HRMS', description: 'Update / Accept Offer Letters' },
  { name: 'delete-offer-letters', action: 'delete', module: 'offer_letters', application: 'HRMS', description: 'Delete Offer Letters' },

  // ─── Onboarding Module ───────────────────────────────────────────────────────
  { name: 'read-onboarding', action: 'read', module: 'onboarding', application: 'HRMS', description: 'View Onboarding module' },
  { name: 'create-onboarding', action: 'create', module: 'onboarding', application: 'HRMS', description: 'Create Onboarding tasks / schedules' },
  { name: 'update-onboarding', action: 'update', module: 'onboarding', application: 'HRMS', description: 'Update Onboarding documents & verify' },
  { name: 'delete-onboarding', action: 'delete', module: 'onboarding', application: 'HRMS', description: 'Delete Onboarding profile' },
  { name: 'sidebar-onboarding', action: 'sidebar', module: 'onboarding', application: 'HRMS', description: 'View Onboarding in sidebar' },

  // ─── Exit Process Module ─────────────────────────────────────────────────────
  { name: 'read-exit', action: 'read', module: 'exit', application: 'HRMS', description: 'View Exit Process module' },
  { name: 'create-exit', action: 'create', module: 'exit', application: 'HRMS', description: 'Initiate Exit Process' },
  { name: 'update-exit', action: 'update', module: 'exit', application: 'HRMS', description: 'Update Exit clearance & settlement' },
  { name: 'delete-exit', action: 'delete', module: 'exit', application: 'HRMS', description: 'Delete Exit record' },
  { name: 'sidebar-exit', action: 'sidebar', module: 'exit', application: 'HRMS', description: 'View Exit Process in sidebar' },
];

async function seedCoreHRPermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database...');

    // 1. Insert or update core HR permissions
    let upsertedCount = 0;
    for (const p of coreHRPermissions) {
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
    console.log(`✅ Upserted ${upsertedCount} Core HR permissions.`);

    // 2. Fetch all permissions for Core HR
    const permsRes = await pool.query(
      `SELECT id, name, application, module, action FROM permissions
       WHERE module IN ('recruitment', 'job_requisitions', 'candidates', 'interview_scheduling', 'offer_letters', 'onboarding', 'exit')`
    );
    const corePerms = permsRes.rows;
    console.log(`Found ${corePerms.length} Core HR permissions in DB.`);

    // 3. Assign all permissions to all existing roles
    const rolesRes = await pool.query('SELECT id, name FROM roles');
    console.log(`Found ${rolesRes.rows.length} roles.`);

    for (const r of rolesRes.rows) {
      let roleAssigned = 0;
      for (const p of corePerms) {
        await pool.query(
          `INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [r.id, p.id]
        );
        roleAssigned++;
      }
      console.log(`✅ Linked ${roleAssigned} Core HR permissions to role: ${r.name}`);
    }

    console.log('\n🎉 Successfully seeded and assigned all Core HR permissions!');
  } catch (err) {
    console.error('Error seeding Core HR permissions:', err);
  } finally {
    await pool.end();
  }
}

seedCoreHRPermissions();
