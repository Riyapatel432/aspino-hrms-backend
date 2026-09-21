const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // 1. Check if employee@aspino.com exists in Employee table
  const empRes = await pool.query(`SELECT * FROM "Employee" WHERE LOWER(email) = 'employee@aspino.com'`);
  const userRes = await pool.query(`SELECT * FROM "User" WHERE LOWER(email) = 'employee@aspino.com'`);
  
  console.log('User employee@aspino.com:', userRes.rows[0] ? userRes.rows[0].id : 'Not found');
  console.log('Employee employee@aspino.com:', empRes.rows[0] ? empRes.rows[0].id : 'Not found');

  if (userRes.rows[0]) {
    const userId = userRes.rows[0].id;
    if (empRes.rows.length === 0) {
      // Get a department
      const deptRes = await pool.query(`SELECT id FROM "Department" LIMIT 1`);
      const deptId = deptRes.rows[0]?.id;
      
      const newEmpId = 'e1111111-2222-3333-4444-555555555555';
      await pool.query(`
        INSERT INTO "Employee" (
          id, "employeeId", "userId", "firstName", "lastName", email, "departmentId", designation, "dateOfJoining", status, "createdAt"
        ) VALUES (
          $1, 'ASP-2026-0099', $2, 'Aspino', 'Employee', 'employee@aspino.com', $3, 'Staff Specialist', NOW(), 'ACTIVE', NOW()
        )
      `, [newEmpId, userId, deptId]);
      console.log('Created Employee record for employee@aspino.com');
    } else {
      await pool.query(`UPDATE "Employee" SET "userId" = $1 WHERE LOWER(email) = 'employee@aspino.com'`, [userId]);
      console.log('Linked employee@aspino.com userId');
    }
  }

  // 2. Link all other employees whose email matches a User
  await pool.query(`
    UPDATE "Employee" e
    SET "userId" = u.id
    FROM "User" u
    WHERE LOWER(e.email) = LOWER(u.email)
    AND (e."userId" IS NULL OR e."userId" != u.id)
  `);
  console.log('Synced all employee userIds by email match.');

  // 3. Ensure employee has some leave balances, attendance logs, and payslip data if missing
  const activeEmp = await pool.query(`SELECT id FROM "Employee" WHERE LOWER(email) = 'employee@aspino.com'`);
  if (activeEmp.rows[0]) {
    const empId = activeEmp.rows[0].id;
    
    // Check leave balances
    const lb = await pool.query(`SELECT * FROM "LeaveBalance" WHERE "employeeId" = $1`, [empId]);
    if (lb.rows.length === 0) {
      await pool.query(`
        INSERT INTO "LeaveBalance" (id, "employeeId", "leaveType", allocated, used)
        VALUES 
          (gen_random_uuid(), $1, 'Casual', 12, 2),
          (gen_random_uuid(), $1, 'Sick', 10, 1),
          (gen_random_uuid(), $1, 'Earned', 15, 3)
      `, [empId]);
      console.log('Created sample Leave Balances for employee@aspino.com');
    }

    // Check attendance records
    const att = await pool.query(`SELECT * FROM "Attendance" WHERE "employeeId" = $1`, [empId]);
    if (att.rows.length === 0) {
      const today = new Date();
      for (let d = 1; d <= 15; d++) {
        const attDate = new Date(today.getFullYear(), today.getMonth(), d, 12, 0, 0);
        const checkIn = new Date(today.getFullYear(), today.getMonth(), d, 9, 0, 0);
        const checkOut = new Date(today.getFullYear(), today.getMonth(), d, 18, 0, 0);
        await pool.query(`
          INSERT INTO "Attendance" (
            id, "employeeId", date, "checkIn", "checkOut", status, "shiftName", "totalWorkHours", "otHours", "presentDay", "captureMethod"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 'PRESENT', 'Morning Shift', 9.0, 0, 1.0, 'BIOMETRIC'
          )
        `, [empId, attDate, checkIn, checkOut]);
      }
      console.log('Created sample Attendance records for employee@aspino.com');
    }
  }

  await pool.end();
}

main().catch(console.error);
