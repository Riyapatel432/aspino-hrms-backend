const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aspino_erp';
  const pool = new Pool({ connectionString });
  
  try {
    console.log('Ensuring all ExitProcess records have clearance tasks...');

    const exitsRes = await pool.query('SELECT id FROM "ExitProcess";');
    const departments = ['IT', 'Finance', 'Admin', 'HR', 'Store', 'Library', 'Security'];

    const crypto = require('crypto');

    for (const exitRow of exitsRes.rows) {
      const exitId = exitRow.id;
      for (const deptName of departments) {
        // Find or create department
        let deptRes = await pool.query('SELECT id FROM "Department" WHERE UPPER(name) = UPPER($1) LIMIT 1', [deptName]);
        let deptId;
        if (deptRes.rows.length === 0) {
          deptId = crypto.randomUUID();
          await pool.query('INSERT INTO "Department" (id, name, "isActive", "createdAt") VALUES ($1, $2, true, NOW())', [deptId, deptName]);
        } else {
          deptId = deptRes.rows[0].id;
        }

        // Check if task exists
        const taskCheck = await pool.query('SELECT id FROM "ClearanceTask" WHERE "exitProcessId" = $1 AND "departmentId" = $2 LIMIT 1', [exitId, deptId]);
        if (taskCheck.rows.length === 0) {
          const taskId = crypto.randomUUID();
          await pool.query(
            'INSERT INTO "ClearanceTask" (id, "exitProcessId", "departmentId", "taskDescription", status) VALUES ($1, $2, $3, $4, $5)',
            [taskId, exitId, deptId, `Complete ${deptName} assets and dues clearance checklist.`, 'PENDING']
          );
        }
      }
    }

    console.log('Successfully provisioned clearance tasks for all exit processes!');
  } catch (err) {
    console.error('Clearance provisioning error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
