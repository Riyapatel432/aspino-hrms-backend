const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const users = await pool.query(`SELECT id, email, name, role FROM "User"`);
  const emps = await pool.query(`SELECT id, "employeeId", "firstName", "lastName", email, "userId" FROM "Employee"`);
  
  for (const u of users.rows) {
    const match = emps.rows.find(e => 
      (e.email && u.email && e.email.toLowerCase() === u.email.toLowerCase()) ||
      (e.firstName && u.name && e.firstName.toLowerCase() === u.name.toLowerCase()) ||
      (`${e.firstName} ${e.lastName}`.toLowerCase() === (u.name || '').toLowerCase()) ||
      (u.email && u.email.includes('riya') && e.email && e.email.includes('riya')) ||
      (u.email && u.email.includes('ziya') && e.email && e.email.includes('ziya'))
    );
    if (match) {
      await pool.query(`UPDATE "Employee" SET "userId" = $1, email = $2 WHERE id = $3`, [u.id, u.email, match.id]);
      console.log(`Synced user ${u.email} <-> employee ${match.firstName} ${match.lastName} (${match.employeeId}, ${match.id})`);
    }
  }

  // Also create leave balances and sample records for Riya and Ziya if needed
  const riyaEmp = emps.rows.find(e => e.employeeId === 'aspino_2026_004' || e.firstName === 'Riya');
  if (riyaEmp) {
    const lb = await pool.query(`SELECT * FROM "LeaveBalance" WHERE "employeeId" = $1`, [riyaEmp.id]);
    if (lb.rows.length === 0) {
      await pool.query(`
        INSERT INTO "LeaveBalance" (id, "employeeId", "leaveType", allocated, used)
        VALUES 
          (gen_random_uuid(), $1, 'Casual', 12, 1),
          (gen_random_uuid(), $1, 'Sick', 10, 0),
          (gen_random_uuid(), $1, 'Earned', 15, 0)
      `, [riyaEmp.id]);
      console.log('Created Leave Balances for Riya');
    }
  }

  await pool.end();
}

main().catch(console.error);
