const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public';
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- Seeding Multi-Punch & Break Detection Data into Database ---');

    // 1. Fetch existing employees
    const empRes = await client.query('SELECT id, "employeeId", "firstName", "lastName" FROM "Employee" LIMIT 20');
    if (empRes.rows.length === 0) {
      console.log('No employees found in DB.');
      return;
    }
    console.log(`Found ${empRes.rows.length} employees.`);

    // 2. Fetch or find General Shift
    let shiftRes = await client.query('SELECT id, name FROM "Shift" WHERE name ILIKE \'%General%\' LIMIT 1');
    let shiftId = shiftRes.rows[0]?.id;
    let shiftName = shiftRes.rows[0]?.name || 'General Shift';

    if (!shiftId) {
      const anyShift = await client.query('SELECT id, name FROM "Shift" LIMIT 1');
      shiftId = anyShift.rows[0]?.id;
      shiftName = anyShift.rows[0]?.name || 'General Shift';
    }

    // 3. For August 2026, seed realistic multi-punch attendance records
    // Scenario 1: Allowed 1-hour lunch break (09:00 -> 13:00, 14:00 -> 18:00) -> 60m Break, 8.0 hrs work
    // Scenario 2: Excess break (>1h not allowed) (09:00 -> 13:00, 14:45 -> 18:30) -> 105m Break (45m excess penalty)
    // Scenario 3: Multiple tea + lunch breaks within 1h (09:00 -> 11:00, 11:15 -> 13:30, 14:15 -> 18:00) -> 60m Break

    const testDates = [
      '2026-08-01', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'
    ];

    for (let i = 0; i < empRes.rows.length; i++) {
      const emp = empRes.rows[i];

      for (const dStr of testDates) {
        const noonDate = new Date(`${dStr}T12:00:00.000Z`);
        const dayStart = new Date(`${dStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dStr}T23:59:59.999Z`);

        // Check if attendance already exists
        const existRes = await client.query(
          'SELECT id FROM "Attendance" WHERE "employeeId" = $1 AND date >= $2 AND date <= $3',
          [emp.id, dayStart, dayEnd]
        );

        let checkInDate = new Date(`${dStr}T09:00:00.000Z`);
        let checkOutDate = new Date(`${dStr}T18:00:00.000Z`);
        let workHours = 8.0;
        let excessMins = 0;
        let deductionHours = 0.0;
        let hasComplaint = false;
        let status = 'PRESENT';

        // Introduce an excess break for employee index 1 (e.g. Deepak / Sneha / Suresh on day 5 and day 11)
        if (i % 3 === 1 && (dStr === '2026-08-05' || dStr === '2026-08-11')) {
          checkInDate = new Date(`${dStr}T09:00:00.000Z`);
          checkOutDate = new Date(`${dStr}T18:30:00.000Z`);
          excessMins = 45; // 105 mins total break - 60 mins allowed = 45m excess
          deductionHours = 0.75;
          workHours = 7.75;
          hasComplaint = true;
        }

        let attId;
        if (existRes.rows.length > 0) {
          attId = existRes.rows[0].id;
          await client.query(
            `UPDATE "Attendance" SET 
              "checkIn" = $1, 
              "checkOut" = $2, 
              "totalWorkHours" = $3, 
              "breakMisuseMinutes" = $4, 
              "breakDeductionHours" = $5, 
              "hasBreakComplaint" = $6, 
              "captureMethod" = $7,
              "shiftId" = $8,
              "shiftName" = $9,
              status = $10
            WHERE id = $11`,
            [checkInDate, checkOutDate, workHours, excessMins, deductionHours, hasComplaint, 'BIOMETRIC_MULTI_PUNCH', shiftId, shiftName, status, attId]
          );
        } else {
          attId = randomUUID();
          await client.query(
            `INSERT INTO "Attendance" 
              (id, "employeeId", date, "checkIn", "checkOut", "totalWorkHours", "breakMisuseMinutes", "breakDeductionHours", "hasBreakComplaint", "captureMethod", "shiftId", "shiftName", status, "presentDay")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1.0)`,
            [attId, emp.id, noonDate, checkInDate, checkOutDate, workHours, excessMins, deductionHours, hasComplaint, 'BIOMETRIC_MULTI_PUNCH', shiftId, shiftName, status]
          );
        }

        // If excess break, create Break Incident
        if (hasComplaint) {
          const incId = randomUUID();
          await client.query(
            `INSERT INTO "BreakMisuseIncident" 
              (id, "attendanceId", "employeeId", "incidentDate", "breakType", "excessMinutes", "deductionHours", severity, "complaintDetails", "reportedByName", status, "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT DO NOTHING`,
            [incId, attId, emp.id, noonDate, 'LUNCH_BREAK', excessMins, deductionHours, 'WARNING', `Biometric multi-punch auto rule: Total break took 105 mins (45 mins excess over 1-hour limit).`, 'Biometric Auto-Rule Engine', 'REPORTED']
          );
        }
      }
    }

    console.log('✅ Successfully seeded multi-punch attendance records and break time calculations in PostgreSQL database!');
  } catch (err) {
    console.error('Error seeding attendance:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
