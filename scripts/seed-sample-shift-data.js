const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Seed Sample Shift & Employee Data ---');

    // 1. Ensure Standard Departments
    const depts = [
      { name: 'IT' },
      { name: 'HR' },
      { name: 'Finance' },
      { name: 'Production' },
      { name: 'QA' },
    ];

    const deptMap = {};
    for (const d of depts) {
      let res = await client.query('SELECT id, name FROM "Department" WHERE UPPER(name) = UPPER($1)', [d.name]);
      if (res.rows.length === 0) {
        const id = randomUUID();
        res = await client.query('INSERT INTO "Department" (id, name, "createdAt") VALUES ($1, $2, NOW()) RETURNING id, name', [id, d.name]);
      }
      deptMap[d.name.toUpperCase()] = res.rows[0].id;
    }
    console.log('Departments:', deptMap);

    // 2. Ensure Sample Shifts
    const shifts = [
      { name: 'Morning Shift', startTime: '08:00', endTime: '16:30', graceTimeMinutes: 15, breakDurationMinutes: 60, breakRules: '45 min Lunch + 15 min Tea', isNightShift: false, color: '#0284c7' },
      { name: 'General Shift', startTime: '09:00', endTime: '17:30', graceTimeMinutes: 15, breakDurationMinutes: 60, breakRules: '60 min Lunch', isNightShift: false, color: '#10b981' },
      { name: 'Evening Shift', startTime: '14:00', endTime: '22:30', graceTimeMinutes: 15, breakDurationMinutes: 45, breakRules: '30 min Dinner + 15 min Tea', isNightShift: false, color: '#f59e0b' },
      { name: 'Night Shift', startTime: '22:00', endTime: '06:30', graceTimeMinutes: 10, breakDurationMinutes: 45, breakRules: '45 min Midnight Refreshment', isNightShift: true, color: '#8b5cf6' },
    ];

    const shiftMap = {};
    for (const s of shifts) {
      let res = await client.query('SELECT id, name FROM "Shift" WHERE name = $1', [s.name]);
      if (res.rows.length === 0) {
        const id = randomUUID();
        res = await client.query(
          'INSERT INTO "Shift" (id, name, "startTime", "endTime", "graceTimeMinutes", "breakDurationMinutes", "breakRules", "isNightShift", color, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name',
          [id, s.name, s.startTime, s.endTime, s.graceTimeMinutes, s.breakDurationMinutes, s.breakRules, s.isNightShift, s.color, `${s.name} standard timing`]
        );
      }
      shiftMap[s.name] = res.rows[0].id;
    }
    console.log('Shifts:', shiftMap);

    // 3. Seed Sample Employees across departments
    const sampleEmployees = [
      // IT
      { employeeId: 'EMP_IT_001', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.it@aspino.com', dept: 'IT', designation: 'Senior Full Stack Developer' },
      { employeeId: 'EMP_IT_002', firstName: 'Sneha', lastName: 'Roy', email: 'sneha.it@aspino.com', dept: 'IT', designation: 'DevOps & Cloud Engineer' },
      { employeeId: 'EMP_IT_003', firstName: 'Vikram', lastName: 'Desai', email: 'vikram.it@aspino.com', dept: 'IT', designation: 'Database Administrator' },
      // HR
      { employeeId: 'EMP_HR_001', firstName: 'Ananya', lastName: 'Verma', email: 'ananya.hr@aspino.com', dept: 'HR', designation: 'Talent Acquisition Lead' },
      { employeeId: 'EMP_HR_002', firstName: 'Karan', lastName: 'Mehta', email: 'karan.hr@aspino.com', dept: 'HR', designation: 'HR Operations Executive' },
      // Finance
      { employeeId: 'EMP_FIN_001', firstName: 'Pooja', lastName: 'Singhania', email: 'pooja.fin@aspino.com', dept: 'FINANCE', designation: 'Financial Controller' },
      { employeeId: 'EMP_FIN_002', firstName: 'Manish', lastName: 'Gupta', email: 'manish.fin@aspino.com', dept: 'FINANCE', designation: 'Senior Payroll Accountant' },
      // Production
      { employeeId: 'EMP_PROD_001', firstName: 'Suresh', lastName: 'Patel', email: 'suresh.prod@aspino.com', dept: 'PRODUCTION', designation: 'Production Line Lead' },
      { employeeId: 'EMP_PROD_002', firstName: 'Deepak', lastName: 'Joshi', email: 'deepak.prod@aspino.com', dept: 'PRODUCTION', designation: 'Chemical Plant Operator' },
    ];

    const empIdList = [];
    for (const emp of sampleEmployees) {
      const deptId = deptMap[emp.dept.toUpperCase()];
      let res = await client.query('SELECT id, "employeeId" FROM "Employee" WHERE "employeeId" = $1 OR email = $2', [emp.employeeId, emp.email]);
      let employeeDbId;
      if (res.rows.length === 0) {
        employeeDbId = randomUUID();
        await client.query(
          'INSERT INTO "Employee" (id, "employeeId", "firstName", "lastName", email, designation, "departmentId", status, "dateOfJoining", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
          [employeeDbId, emp.employeeId, emp.firstName, emp.lastName, emp.email, emp.designation, deptId, 'ACTIVE']
        );
      } else {
        employeeDbId = res.rows[0].id;
        await client.query('UPDATE "Employee" SET "departmentId" = $1 WHERE id = $2', [deptId, employeeDbId]);
      }
      empIdList.push({ id: employeeDbId, ...emp });
    }
    console.log(`Seeded ${sampleEmployees.length} employees across all departments.`);

    // 4. Seed a few sample Rosters for the current week
    const today = new Date();
    const morningShiftId = shiftMap['Morning Shift'] || Object.values(shiftMap)[0];
    const generalShiftId = shiftMap['General Shift'] || Object.values(shiftMap)[1];

    for (let dOffset = 0; dOffset < 5; dOffset++) {
      const rDate = new Date(today);
      rDate.setDate(today.getDate() + dOffset);
      const dateStr = rDate.toISOString().split('T')[0];

      for (let i = 0; i < Math.min(4, empIdList.length); i++) {
        const emp = empIdList[i];
        const assignedShiftId = i % 2 === 0 ? morningShiftId : generalShiftId;

        const existing = await client.query('SELECT id FROM "ShiftRoster" WHERE "employeeId" = $1 AND date::date = $2::date', [emp.id, dateStr]);
        if (existing.rows.length === 0) {
          const rId = randomUUID();
          await client.query(
            'INSERT INTO "ShiftRoster" (id, "employeeId", "shiftId", "departmentId", "managedByHod", date, reason) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [rId, emp.id, assignedShiftId, deptMap[emp.dept.toUpperCase()], 'Department HOD', rDate, 'Standard weekly allocation']
          );
        }
      }
    }

    console.log('--- Sample Data Seeding Completed Successfully! ---');
  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
