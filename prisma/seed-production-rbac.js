/**
 * PRODUCTION RBAC SEEDER SCRIPT
 * 
 * Safely seeds/syncs all Users, Roles, Permissions, and RolePermissions into PostgreSQL.
 * - Idempotent (Safe to run multiple times without duplicating or corrupting data)
 * - Non-destructive (Does not delete existing data or change existing IDs/keys)
 * 
 * Usage:
 *   node prisma/seed-production-rbac.js
 *   or: npm run seed:rbac
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (.env in current dir, or parent dirs)
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function seed() {
  const dataFile = path.join(__dirname, 'production-rbac-data.json');
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ ERROR: Data file not found at: ${dataFile}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  console.log('======================================================');
  console.log('  STARTING PRODUCTION RBAC SEEDING');
  console.log('======================================================');
  console.log(`Loaded dataset metadata:`, data.metadata);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Permissions
    console.log(`\n1. Seeding ${data.permissions.length} Permissions...`);
    let permInserted = 0;
    let permUpdated = 0;
    for (const p of data.permissions) {
      const res = await client.query(
        `
        INSERT INTO permissions (id, name, action, module, application, description, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (application, module, action) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          "updatedAt" = NOW()
        RETURNING (xmax = 0) AS inserted;
        `,
        [p.id || crypto.randomUUID(), p.name, p.action, p.module, p.application || 'GLOBAL', p.description || null]
      );
      if (res.rows[0]?.inserted) permInserted++;
      else permUpdated++;
    }
    console.log(`   ✅ Permissions: ${permInserted} inserted, ${permUpdated} verified/updated.`);

    // 2. Seed Roles
    console.log(`\n2. Seeding ${data.roles.length} Roles...`);
    let roleInserted = 0;
    let roleUpdated = 0;
    for (const r of data.roles) {
      const res = await client.query(
        `
        INSERT INTO roles (id, name, "displayName", description, "isSystem", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          "displayName" = EXCLUDED."displayName",
          description = EXCLUDED.description,
          "isSystem" = EXCLUDED."isSystem",
          "updatedAt" = NOW()
        RETURNING (xmax = 0) AS inserted;
        `,
        [r.id || crypto.randomUUID(), r.name, r.displayName, r.description || null, Boolean(r.isSystem)]
      );
      if (res.rows[0]?.inserted) roleInserted++;
      else roleUpdated++;
    }
    console.log(`   ✅ Roles: ${roleInserted} inserted, ${roleUpdated} verified/updated.`);

    // Refresh role & permission lookup maps by name and id
    const roleRows = await client.query('SELECT id, name FROM roles');
    const roleMap = new Map(roleRows.rows.map(r => [r.name, r.id]));

    const permRows = await client.query('SELECT id, name FROM permissions');
    const permMap = new Map(permRows.rows.map(p => [p.name, p.id]));

    // 3. Seed Role Permissions
    console.log(`\n3. Seeding ${data.rolePermissions.length} Role-Permission Relations...`);
    let rpLinked = 0;
    let rpExisting = 0;
    for (const rp of data.rolePermissions) {
      const roleId = roleMap.get(rp.roleName) || rp.roleId;
      const permissionId = permMap.get(rp.permissionName) || rp.permissionId;

      if (!roleId || !permissionId) {
        continue;
      }

      const res = await client.query(
        `
        INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
        RETURNING id;
        `,
        [rp.id || crypto.randomUUID(), roleId, permissionId]
      );

      if (res.rows.length > 0) {
        rpLinked++;
      } else {
        rpExisting++;
      }
    }
    console.log(`   ✅ Role-Permissions: ${rpLinked} inserted, ${rpExisting} already existing.`);

    // 4. Seed Users
    console.log(`\n4. Seeding ${data.users.length} System Users...`);
    let userInserted = 0;
    let userUpdated = 0;
    for (const u of data.users) {
      const targetRoleId = u.roleId || (u.role ? roleMap.get(u.role) : null);
      const res = await client.query(
        `
        INSERT INTO "User" (id, name, email, password, role, "roleId", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          "roleId" = EXCLUDED."roleId"
        RETURNING (xmax = 0) AS inserted;
        `,
        [u.id || crypto.randomUUID(), u.name, u.email, u.password, u.role, targetRoleId]
      );
      if (res.rows[0]?.inserted) userInserted++;
      else userUpdated++;
    }
    console.log(`   ✅ Users: ${userInserted} inserted, ${userUpdated} verified/updated.`);

    await client.query('COMMIT');
    console.log('\n======================================================');
    console.log('  🎉 PRODUCTION RBAC SEEDING COMPLETED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ SEEDING FAILED WITH ERROR:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed().finally(() => pool.end());
