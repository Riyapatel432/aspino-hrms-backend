const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function runPayrollSeed() {
  const client = await pool.connect();
  try {
    console.log('================================================================');
    console.log('  SEEDING REALISTIC PHARMA ATTENDANCE, SHIFTS & SALARY FLOW');
    console.log('================================================================');

    // 1. Get Production & Finance test employees
    const empsRes = await client.query(`
      SELECT e.id, e."employeeId", e."firstName", e."lastName", e.email, d.name as department
      FROM "Employee" e
      LEFT JOIN "Department" d ON e."departmentId" = d.id
      WHERE e."employeeId" IN ('EMP_PROD_002', 'EMP_PROD_001', 'EMP_FIN_002')
    `);

    if (empsRes.rows.length === 0) {
      console.log('Employees not found! Please run seed-sample-shift-data.js first.');
      return;
    }

    const deepak = empsRes.rows.find(e => e.employeeId === 'EMP_PROD_002');
    const suresh = empsRes.rows.find(e => e.employeeId === 'EMP_PROD_001');
    const manish = empsRes.rows.find(e => e.employeeId === 'EMP_FIN_002');

    console.log(`Found target test employees:`);
    console.log(`- ${deepak?.firstName} ${deepak?.lastName} (${deepak?.employeeId})`);
    console.log(`- ${suresh?.firstName} ${suresh?.lastName} (${suresh?.employeeId})`);
    console.log(`- ${manish?.firstName} ${manish?.lastName} (${manish?.employeeId})`);

    // 2. Ensure Salary Structures for these employees
    const salaryConfigs = [
      { empId: deepak.id, basic: 30000, hra: 12000, da: 5000, special: 6000, gross: 53000, pf: 1800, esi: 0, pt: 200 },
      { empId: suresh.id, basic: 35000, hra: 14000, da: 6000, special: 8000, gross: 63000, pf: 1800, esi: 0, pt: 200 },
      { empId: manish.id, basic: 28000, hra: 11200, da: 4500, special: 5000, gross: 48700, pf: 1800, esi: 0, pt: 200 },
    ];

    for (const sc of salaryConfigs) {
      const existing = await client.query(
        'SELECT id FROM "SalaryStructure" WHERE "employeeId" = $1 AND month = 8 AND year = 2026',
        [sc.empId]
      );
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO "SalaryStructure" (
            id, "employeeId", month, year, "basicSalary", "hraAmount", da,
            "specialAllowance", "statutoryBonus", reimbursements, "grossSalary",
            "pfAmount", "esiAmount", "ptAmount", "effectiveFrom", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, 8, 2026, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, NOW(), NOW(), NOW()
          )
        `, [randomUUID(), sc.empId, sc.basic, sc.hra, sc.da, sc.special, sc.gross, sc.pf, sc.esi, sc.pt]);
      } else {
        await client.query(`
          UPDATE "SalaryStructure"
          SET "basicSalary" = $1, "hraAmount" = $2, da = $3, "specialAllowance" = $4,
              "grossSalary" = $5, "pfAmount" = $6, "ptAmount" = $7, "updatedAt" = NOW()
          WHERE id = $8
        `, [sc.basic, sc.hra, sc.da, sc.special, sc.gross, sc.pf, sc.pt, existing.rows[0].id]);
      }
    }
    console.log('✓ Salary structures verified for August 2026.');

    // 3. Clear existing attendance for August 2026 for these employees to provide clean test data
    await client.query(`
      DELETE FROM "Attendance"
      WHERE "employeeId" IN ($1, $2, $3)
      AND date >= '2026-08-01' AND date <= '2026-08-31'
    `, [deepak.id, suresh.id, manish.id]);

    // 4. Seed 31 Days of Attendance for August 2026
    // Deepak: 26 present, 16 OT hours (2x holdovers: 8.5h on 21st, 7.5h on 14th), 6 night shifts, 1 Sunday shift
    for (let day = 1; day <= 31; day++) {
      const dateObj = new Date(`2026-08-${String(day).padStart(2, '0')}T00:00:00.000Z`);
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday

      // --- DEEPAK JOSHI (Pharma Production Continuous Operator) ---
      let deepakStatus = 'PRESENT';
      let deepakShift = 'Evening Shift (14:00 - 22:30)';
      let deepakCheckIn = new Date(`2026-08-${String(day).padStart(2, '0')}T14:00:00.000Z`);
      let deepakCheckOut = new Date(`2026-08-${String(day).padStart(2, '0')}T22:30:00.000Z`);
      let deepakOT = 0;
      let deepakFullNight = false;
      let deepakSunday = false;

      if (day === 21) {
        // Continuous Shift Handover Holdover: worked double shift into night
        deepakOT = 8.5;
        deepakCheckOut = new Date(`2026-08-22T07:00:00.000Z`);
        deepakFullNight = true;
      } else if (day === 14) {
        // Earlier Holdover OT
        deepakOT = 7.5;
        deepakCheckOut = new Date(`2026-08-15T06:00:00.000Z`);
        deepakFullNight = true;
      } else if (day >= 1 && day <= 4) {
        // Regular Night Shifts
        deepakShift = 'Night Shift (22:00 - 06:30)';
        deepakCheckIn = new Date(`2026-08-${String(day).padStart(2, '0')}T22:00:00.000Z`);
        deepakCheckOut = new Date(`2026-08-${String(day + 1).padStart(2, '0')}T06:30:00.000Z`);
        deepakFullNight = true;
      } else if (dayOfWeek === 0 && day === 9) {
        // Sunday Special Extra Duty Shift
        deepakSunday = true;
        deepakShift = 'Morning Shift (08:00 - 16:30)';
        deepakCheckIn = new Date(`2026-08-09T08:00:00.000Z`);
        deepakCheckOut = new Date(`2026-08-09T16:30:00.000Z`);
      } else if (dayOfWeek === 0) {
        // Other Sundays off
        deepakStatus = 'WEEKEND';
        deepakCheckIn = null;
        deepakCheckOut = null;
      }

      if (deepakStatus !== 'WEEKEND' || deepakSunday) {
        await client.query(`
          INSERT INTO "Attendance" (
            id, "employeeId", date, "checkIn", "checkOut", status, "otHours",
            "isFullNightPresent", "isSundayPresent", "isHolidayPresent", "shiftName", "captureMethod"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'MANUAL'
          )
        `, [
          randomUUID(), deepak.id, dateObj, deepakCheckIn, deepakCheckOut,
          'PRESENT', deepakOT, deepakFullNight, deepakSunday, false, deepakShift
        ]);
      }

      // --- SURESH PATEL (Production Lead) ---
      let sureshStatus = 'PRESENT';
      let sureshOT = (day === 5 || day === 12) ? 4.0 : 0;
      let sureshNight = day >= 10 && day <= 16;
      if (dayOfWeek === 0) {
        sureshStatus = 'WEEKEND';
      }
      if (sureshStatus === 'PRESENT') {
        await client.query(`
          INSERT INTO "Attendance" (
            id, "employeeId", date, "checkIn", "checkOut", status, "otHours",
            "isFullNightPresent", "isSundayPresent", "isHolidayPresent", "shiftName", "captureMethod"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, false, false, $9, 'MANUAL'
          )
        `, [
          randomUUID(), suresh.id, dateObj,
          new Date(`2026-08-${String(day).padStart(2, '0')}T08:00:00.000Z`),
          new Date(`2026-08-${String(day).padStart(2, '0')}T16:30:00.000Z`),
          'PRESENT', sureshOT, sureshNight, sureshNight ? 'Night Shift' : 'Morning Shift'
        ]);
      }

      // --- MANISH GUPTA (Finance Lead with 2 LWP days) ---
      let manishStatus = 'PRESENT';
      if (dayOfWeek === 0) {
        manishStatus = 'WEEKEND';
      } else if (day === 18 || day === 19) {
        manishStatus = 'ABSENT'; // LWP days
      }

      if (manishStatus === 'PRESENT') {
        await client.query(`
          INSERT INTO "Attendance" (
            id, "employeeId", date, "checkIn", "checkOut", status, "otHours",
            "isFullNightPresent", "isSundayPresent", "isHolidayPresent", "shiftName", "captureMethod"
          ) VALUES (
            $1, $2, $3, $4, $5, 'PRESENT', 0, false, false, false, 'General Shift (09:00 - 17:30)', 'MANUAL'
          )
        `, [
          randomUUID(), manish.id, dateObj,
          new Date(`2026-08-${String(day).padStart(2, '0')}T09:00:00.000Z`),
          new Date(`2026-08-${String(day).padStart(2, '0')}T17:30:00.000Z`)
        ]);
      }
    }

    console.log('✓ Seeded 31-day attendance records with Holdovers, OT, Night Shifts, & Sunday extra duties.');

    // 5. Seed an approved LWP Leave record for Manish Gupta (18th to 19th Aug)
    const existingLeave = await client.query(
      'SELECT id FROM "LeaveApplication" WHERE "employeeId" = $1 AND "startDate" = $2',
      [manish.id, new Date('2026-08-18T00:00:00.000Z')]
    );
    if (existingLeave.rows.length === 0) {
      await client.query(`
        INSERT INTO "LeaveApplication" (
          id, "employeeId", "leaveType", "startDate", "endDate", reason, status
        ) VALUES (
          $1, $2, 'LWP', '2026-08-18T00:00:00.000Z', '2026-08-19T00:00:00.000Z',
          'Personal emergency - Leave Without Pay', 'APPROVED'
        )
      `, [randomUUID(), manish.id]);
    }
    console.log('✓ Seeded LWP Leave Application for Manish Gupta.');

  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    pool.end();
  }

  // 6. Trigger Payroll Calculation API for Month 8, Year 2026
  console.log('\nExecuting automated Payroll Run for August 2026 (Month 8)...');
  const postData = JSON.stringify({ month: 8, year: 2026 });
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/staff-hrms/payroll/run',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, (res) => {
    let raw = '';
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => {
      console.log(`Payroll Run API Status: ${res.statusCode}`);
      try {
        const result = JSON.parse(raw);
        console.log('----------------------------------------------------------------');
        console.log('  AUTOMATED SALARY CALCULATION SUMMARY:');
        console.log('----------------------------------------------------------------');
        if (result && result.payslips) {
          result.payslips.forEach(ps => {
            console.log(`\n• EMPLOYEE: ${ps.employee?.firstName || ps.employeeId} (${ps.employee?.designation || ''})`);
            console.log(`  - Payable Days: ${ps.payableDays} / ${ps.totalDays} (LWP: ${ps.lwpDays} days)`);
            console.log(`  - OT Hours: ${ps.otHours} hrs (Holdover Double OT Rate applied)`);
            console.log(`  - Basic: ₹${ps.basicSalary.toLocaleString()} | HRA: ₹${ps.hra.toLocaleString()} | DA: ₹${ps.da.toLocaleString()}`);
            console.log(`  - Special Allowance & Extra Shift Earnings: ₹${ps.specialAllowance.toLocaleString()}`);
            console.log(`  - Total Gross Pay: ₹${ps.grossEarnings.toLocaleString()}`);
            console.log(`  - Statutory Deductions: ₹${ps.totalDeductions.toLocaleString()} (PF: ₹${ps.pfDeduction}, PT: ₹${ps.ptDeduction}, TDS: ₹${ps.tdsDeduction})`);
            console.log(`  - NET SALARY DISBURSED: ₹${ps.netSalary.toLocaleString()}`);
          });
        }
        console.log('================================================================');
      } catch (e) {
        console.log('Response:', raw);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Payroll Run Request Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

runPayrollSeed();
