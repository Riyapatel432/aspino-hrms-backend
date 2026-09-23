const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Aspino-Hrms/nestjs-aspino-hrms/.env' });

const exitPermissions = [
  // ─── Exit Process Main Module ────────────────────────────────────────────────
  { name: 'read-exit', action: 'read', module: 'exit', application: 'HRMS', description: 'View Exit Process module' },
  { name: 'create-exit', action: 'create', module: 'exit', application: 'HRMS', description: 'Initiate Exit Process' },
  { name: 'update-exit', action: 'update', module: 'exit', application: 'HRMS', description: 'Update Exit clearance & settlement' },
  { name: 'delete-exit', action: 'delete', module: 'exit', application: 'HRMS', description: 'Delete Exit record' },
  { name: 'sidebar-exit', action: 'sidebar', module: 'exit', application: 'HRMS', description: 'View Exit Process in sidebar' },

  // ─── Submodule 1: Resignation & Clearance ─────────────────────────────────────
  { name: 'read-resignation-clearance', action: 'read', module: 'resignation_clearance', application: 'HRMS', description: 'View Resignation & Clearance' },
  { name: 'create-resignation-clearance', action: 'create', module: 'resignation_clearance', application: 'HRMS', description: 'Register Resignation & initiate exit' },
  { name: 'update-resignation-clearance', action: 'update', module: 'resignation_clearance', application: 'HRMS', description: 'Update Exit clearance items & status' },
  { name: 'delete-resignation-clearance', action: 'delete', module: 'resignation_clearance', application: 'HRMS', description: 'Delete Resignation record' },

  // ─── Submodule 2: F&F Settlement ──────────────────────────────────────────────
  { name: 'read-fnf-settlement', action: 'read', module: 'fnf_settlement', application: 'HRMS', description: 'View Full & Final Settlement' },
  { name: 'create-fnf-settlement', action: 'create', module: 'fnf_settlement', application: 'HRMS', description: 'Record & Process Final Dues / Settlement' },
  { name: 'update-fnf-settlement', action: 'update', module: 'fnf_settlement', application: 'HRMS', description: 'Update F&F Settlement' },
  { name: 'delete-fnf-settlement', action: 'delete', module: 'fnf_settlement', application: 'HRMS', description: 'Delete F&F Settlement' },

  // ─── Submodule 3: Relieving / Experience Letters ──────────────────────────────
  { name: 'read-relieving-letters', action: 'read', module: 'relieving_letters', application: 'HRMS', description: 'View Relieving & Experience Letters' },
  { name: 'create-relieving-letters', action: 'create', module: 'relieving_letters', application: 'HRMS', description: 'Generate & Print Letters' },
  { name: 'update-relieving-letters', action: 'update', module: 'relieving_letters', application: 'HRMS', description: 'Edit Letter Templates' },
  { name: 'delete-relieving-letters', action: 'delete', module: 'relieving_letters', application: 'HRMS', description: 'Delete Letters' },
];

async function seedExitPermissions() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connecting to database...');

    // 1. Insert or update exit permissions
    let upsertedCount = 0;
    for (const p of exitPermissions) {
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
    console.log(`✅ Upserted ${upsertedCount} Exit Process permissions.`);

    // 2. Fetch all permissions for Exit Process
    const permsRes = await pool.query(
      `SELECT id, name, application, module, action FROM permissions
       WHERE module IN ('exit', 'resignation_clearance', 'fnf_settlement', 'relieving_letters')`
    );
    const exitPerms = permsRes.rows;
    console.log(`Found ${exitPerms.length} Exit permissions in DB.`);

    // 3. Assign permissions ONLY to SUPER_ADMIN and ADMIN by default
    const rolesRes = await pool.query("SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN')");
    console.log(`Found ${rolesRes.rows.length} admin roles.`);

    for (const r of rolesRes.rows) {
      let roleAssigned = 0;
      for (const p of exitPerms) {
        await pool.query(
          `INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          [r.id, p.id]
        );
        roleAssigned++;
      }
      console.log(`✅ Linked ${roleAssigned} Exit permissions to admin role: ${r.name}`);
    }

    console.log('\n🎉 Successfully seeded and assigned all Exit Process permissions!');
  } catch (err) {
    console.error('Error seeding Exit Process permissions:', err);
  } finally {
    await pool.end();
  }
}

seedExitPermissions();
