import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding complete 31-day July 2026 Attendance with all status types (P, A, HD, CL, SL, SP)...');

  const employees = await prisma.employee.findMany();
  console.log(`Found ${employees.length} employees in DB.`);

  if (employees.length === 0) {
    console.log('No employees found to seed attendance.');
    return;
  }

  const year = 2026;
  const totalDays = 31;
  let insertedCount = 0;

  for (let empIdx = 0; empIdx < employees.length; empIdx++) {
    const emp = employees[empIdx];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-07-${day.toString().padStart(2, '0')}`;
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
      const dayOfWeek = new Date(year, 6, day).getDay(); // 0 = Sunday

      let status = 'PRESENT';
      let checkIn: Date | null = new Date(`${dateStr}T09:30:00.000Z`);
      let checkOut: Date | null = new Date(`${dateStr}T18:30:00.000Z`);
      let totalWorkHours = 9.0;
      let otHours = 0;
      let isHalfDay = false;
      let isSundayPresent = false;
      let isHolidayPresent = false;

      // Status variations to showcase all status pill types across all 31 days
      const patternKey = (day + empIdx * 7) % 31;

      if (dayOfWeek === 0) {
        // Sunday
        if (day === 12 || day === 26) {
          status = 'PRESENT';
          isSundayPresent = true;
          otHours = 4.0;
        } else if (empIdx % 2 === 0) {
          status = 'PRESENT';
          isSundayPresent = true;
          otHours = 5.0;
        } else {
          status = 'ABSENT';
          checkIn = null;
          checkOut = null;
          totalWorkHours = 0;
        }
      } else if (patternKey === 3 || patternKey === 15) {
        // Half Day (HD)
        status = 'HALFDAY';
        isHalfDay = true;
        checkOut = new Date(`${dateStr}T13:30:00.000Z`);
        totalWorkHours = 4.0;
      } else if (patternKey === 8 || patternKey === 22) {
        // Leave (CL)
        status = 'CASUAL_LEAVE';
        checkIn = null;
        checkOut = null;
        totalWorkHours = 0;
      } else if (patternKey === 11 || patternKey === 27) {
        // Sick Leave (SL)
        status = 'SICK_LEAVE';
        checkIn = null;
        checkOut = null;
        totalWorkHours = 0;
      } else if (patternKey === 18) {
        // Absent (A)
        status = 'ABSENT';
        checkIn = null;
        checkOut = null;
        totalWorkHours = 0;
      } else if (patternKey === 25) {
        // Special Holiday Present (SP)
        status = 'PRESENT';
        isHolidayPresent = true;
        otHours = 3.0;
      } else {
        // Standard Present (P)
        status = 'PRESENT';
        if (day % 5 === 0) {
          otHours = 1.5;
        }
      }

      const existing = await prisma.attendance.findFirst({
        where: {
          employeeId: emp.id,
          date: dateObj,
        },
      });

      const dataPayload = {
        employeeId: emp.id,
        date: dateObj,
        status,
        shiftName: 'General Shift',
        checkIn,
        checkOut,
        totalWorkHours,
        otHours,
        lateHours: 0,
        earlyGoingHours: 0,
        presentDay: isHalfDay ? 0.5 : (status === 'PRESENT' ? 1.0 : 0),
        isHalfDay,
        isSundayPresent,
        isFullNightPresent: false,
        isHolidayPresent,
        captureMethod: 'BIOMETRIC',
      };

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: dataPayload,
        });
      } else {
        await prisma.attendance.create({
          data: dataPayload,
        });
      }
      insertedCount++;
    }
  }

  console.log(`✅ Successfully seeded 31-day July 2026 Attendance (${insertedCount} records) with P, A, HD, CL, SL, SP across all employees!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding July attendance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
