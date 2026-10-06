const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.name, u.email, u.password, u.role, u."roleId", r.name as "roleName"
    FROM "User" u
    LEFT JOIN roles r ON u."roleId" = r.id
    ORDER BY u.name
  `);
  
  const rolesRes = await pool.query(`
    SELECT id, name, "displayName", description, "isSystem"
    FROM roles
    ORDER BY name
  `);
  
  const permissionsRes = await pool.query(`
    SELECT id, application, module, action, name, description
    FROM permissions
    ORDER BY application, module, action
  `);
  
  const rolePermissionsRes = await pool.query(`
    SELECT rp.id, rp."roleId", rp."permissionId", r.name as "roleName", p.name as "permissionName", p.module, p.action, p.application
    FROM role_permissions rp
    JOIN roles r ON rp."roleId" = r.id
    JOIN permissions p ON rp."permissionId" = p.id
    ORDER BY r.name, p.module, p.action
  `);
  
  console.log(`Users: ${usersRes.rows.length}`);
  console.log(`Roles: ${rolesRes.rows.length}`);
  console.log(`Permissions: ${permissionsRes.rows.length}`);
  console.log(`RolePermissions: ${rolePermissionsRes.rows.length}`);
  
  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      description: "Complete Aspino HRMS RBAC Seed Data (Users, Roles, Permissions, RolePermissions)",
      counts: {
        users: usersRes.rows.length,
        roles: rolesRes.rows.length,
        permissions: permissionsRes.rows.length,
        rolePermissions: rolePermissionsRes.rows.length
      }
    },
    roles: rolesRes.rows,
    permissions: permissionsRes.rows,
    rolePermissions: rolePermissionsRes.rows.map(rp => ({
      id: rp.id,
      roleId: rp.roleId,
      permissionId: rp.permissionId,
      roleName: rp.roleName,
      permissionName: rp.permissionName
    })),
    users: usersRes.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      roleId: u.roleId,
      roleName: u.roleName
    }))
  };
  
  const outPath = path.join(__dirname, '../prisma/production-rbac-data.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');
  console.log(`✅ Successfully exported complete RBAC data to ${outPath}`);
  
  await pool.end();
}

main().catch(console.error);
