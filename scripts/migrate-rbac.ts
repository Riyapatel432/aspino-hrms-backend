import 'dotenv/config';
import { Pool } from 'pg';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Running RBAC DDL migrations on PostgreSQL database...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT UNIQUE NOT NULL,
        "displayName" TEXT NOT NULL,
        description TEXT,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        application TEXT NOT NULL,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT permissions_application_module_action_key UNIQUE (application, module, action)
      );

      CREATE INDEX IF NOT EXISTS permissions_application_module_idx ON permissions(application, module);

      CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "roleId" TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        "permissionId" TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT role_permissions_roleId_permissionId_key UNIQUE ("roleId", "permissionId")
      );

      CREATE INDEX IF NOT EXISTS role_permissions_roleId_idx ON role_permissions("roleId");
      CREATE INDEX IF NOT EXISTS role_permissions_permissionId_idx ON role_permissions("permissionId");

      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'User' AND column_name = 'roleId'
        ) THEN
          ALTER TABLE "User" ADD COLUMN "roleId" TEXT REFERENCES roles(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('✅ RBAC tables (roles, permissions, role_permissions, User.roleId) created successfully in PostgreSQL!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
