import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@aspino.com';
  const adminPassword = 'admin123';
  const adminName = 'Aspino Admin';

  console.log('Seeding User table with Admin/HR user...');

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser;
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'hr',
      },
    });
    console.log(`✅ Admin/HR user created in User table!`);
  } else {
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'hr' },
    });
    console.log(`ℹ️ Admin/HR user updated in User table (${adminEmail})`);
  }

  // HR Manager Account
  const hrEmail = 'hr@aspino.com';
  const hrPassword = 'Hr@123';
  const hrHashedPassword = await bcrypt.hash(hrPassword, 10);
  await prisma.user.upsert({
    where: { email: hrEmail },
    update: { password: hrHashedPassword, role: 'hr' },
    create: {
      name: 'Aspino HR Manager',
      email: hrEmail,
      password: hrHashedPassword,
      role: 'hr',
    },
  });

  // Seed Departments
  console.log('Seeding Departments...');
  const deptProduction = await prisma.department.upsert({
    where: { name: 'Production' },
    update: {},
    create: { name: 'Production' },
  });

  const deptQA = await prisma.department.upsert({
    where: { name: 'Quality Assurance' },
    update: {},
    create: { name: 'Quality Assurance' },
  });

  const deptFinance = await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: { name: 'Finance' },
  });

  const deptHR = await prisma.department.upsert({
    where: { name: 'HR' },
    update: {},
    create: { name: 'HR' },
  });

  const deptIT = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' },
  });

  // Seed Job Requisitions
  console.log('Seeding Job Requisitions...');
  const req1 = await prisma.jobRequisition.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      title: 'Senior Chemical Engineer',
      departmentId: deptProduction.id,
      headcount: 2,
      justification: 'Required for new GMP compliance unit scale-up.',
      jobSpecification: 'B.Tech/M.Tech in Chemical Engineering with 5+ years experience in sterile formulation & USFDA compliance.',
      status: 'APPROVED',
      raisedBy: 'Dr. Ramesh Kumar (Production Head)',
    },
  });

  const req2 = await prisma.jobRequisition.upsert({
    where: { id: '2' },
    update: {},
    create: {
      id: '2',
      title: 'QA Analyst (GMP Compliance)',
      departmentId: deptQA.id,
      headcount: 1,
      justification: 'Backfill for vacant role to maintain FDA certification status.',
      jobSpecification: 'B.Pharm/M.Pharm with 3+ years experience in IPQA, 21 CFR Part 11 documentation, and cleanroom audits.',
      status: 'APPROVED',
      raisedBy: 'Mrs. Sunita Sen (QA Head)',
    },
  });

  // Seed Candidates
  console.log('Seeding Candidates...');
  const cand1 = await prisma.candidate.upsert({
    where: { email: 'amit.sharma@example.com' },
    update: {},
    create: {
      name: 'Amit Sharma',
      email: 'amit.sharma@example.com',
      phone: '+919876543210',
      source: 'Portal',
      status: 'SELECTED',
      requisitionId: req1.id,
    },
  });

  const cand2 = await prisma.candidate.upsert({
    where: { email: 'priya.patel@example.com' },
    update: {},
    create: {
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+919988776655',
      source: 'Referral',
      status: 'INTERVIEWING',
      requisitionId: req2.id,
    },
  });

  // Seed Shifts
  console.log('Seeding Shifts...');
  const shiftGeneral = await prisma.shift.upsert({
    where: { id: '1' },
    update: {},
    create: { id: '1', name: 'General Shift', startTime: '09:00', endTime: '17:30' },
  });
  const shiftMorning = await prisma.shift.upsert({
    where: { id: '2' },
    update: {},
    create: { id: '2', name: 'Morning Shift', startTime: '06:00', endTime: '14:30' },
  });
  const shiftNight = await prisma.shift.upsert({
    where: { id: '3' },
    update: {},
    create: { id: '3', name: 'Night Shift (Pharma Unit)', startTime: '22:00', endTime: '06:30' },
  });

  // Seed Appraisal Cycles
  console.log('Seeding Appraisal Cycles...');
  const cycle = await prisma.appraisalCycle.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'Annual Review Cycle FY 2026',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      status: 'ACTIVE',
    },
  });

  // Seed Training Types
  console.log('Seeding Training Types...');
  const trainingTypeCompliance = await prisma.trainingType.upsert({
    where: { name: 'COMPLIANCE' },
    update: {},
    create: { name: 'COMPLIANCE', isActive: true },
  });

  // Seed Employees
  console.log('Seeding Employees...');
  const emp1 = await prisma.employee.upsert({
    where: { email: 'rajesh.verma@aspino.com' },
    update: {},
    create: {
      employeeId: 'ASP-2026-0001',
      firstName: 'Rajesh',
      lastName: 'Verma',
      email: 'rajesh.verma@aspino.com',
      departmentId: deptProduction.id,
      designation: 'Senior Chemical Engineer',
      dateOfJoining: new Date('2025-01-15'),
      probationStatus: 'CONFIRMED',
      status: 'ACTIVE',
    },
  });

  // Seed Leave Balance for Rajesh
  await prisma.leaveBalance.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      employeeId: emp1.id,
      leaveType: 'Casual',
      allocated: 12,
      used: 2,
    },
  });
  await prisma.leaveBalance.upsert({
    where: { id: '2' },
    update: {},
    create: {
      id: '2',
      employeeId: emp1.id,
      leaveType: 'Sick',
      allocated: 10,
      used: 1,
    },
  });

  // Seed Training for Rajesh (Compliance GMP)
  await prisma.trainingRecord.create({
    data: {
      employeeId: emp1.id,
      trainingName: 'GMP Regulatory Compliance & Pharma Safety Standards',
      trainingTypeId: trainingTypeCompliance.id,
      completionDate: new Date('2026-02-10'),
      expiryDate: new Date('2027-02-10'),
      status: 'COMPLETED',
    },
  });

  // Seed Goals for Rajesh
  await prisma.employeeGoal.create({
    data: {
      employeeId: emp1.id,
      cycleId: cycle.id,
      title: 'GMP Audit Readiness',
      description: 'Achieve zero major non-conformances in the external quality audit.',
      weightage: 50,
      status: 'APPROVED',
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { email: 'sneha.nair@aspino.com' },
    update: {},
    create: {
      employeeId: 'ASP-2026-0002',
      firstName: 'Sneha',
      lastName: 'Nair',
      email: 'sneha.nair@aspino.com',
      departmentId: deptQA.id,
      designation: 'QA Analyst',
      dateOfJoining: new Date('2026-07-01'),
      probationStatus: 'UNDER_REVIEW',
      status: 'ONBOARDING',
    },
  });

  // Onboarding documents for Sneha: ID Proof, Address Proof, Educational Certificates, Previous Employment Documents
  const docs = ['ID Proof', 'Address Proof', 'Educational Certificates', 'Previous Employment Documents'];
  for (const doc of docs) {
    await prisma.onboardingDocument.create({
      data: {
        employeeId: emp2.id,
        documentType: doc,
        status: doc === 'Address Proof' ? 'VERIFIED' : 'PENDING',
        verifiedAt: doc === 'Address Proof' ? new Date() : null,
      },
    });
  }

  // Seed Exit process employee
  const emp3 = await prisma.employee.upsert({
    where: { email: 'vikram.singh@aspino.com' },
    update: {},
    create: {
      employeeId: 'ASP-2024-0099',
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'vikram.singh@aspino.com',
      departmentId: deptProduction.id,
      designation: 'Chemical Operator',
      dateOfJoining: new Date('2024-03-10'),
      probationStatus: 'CONFIRMED',
      status: 'EXITING',
    },
  });

  const exit = await prisma.exitProcess.upsert({
    where: { employeeId: emp3.id },
    update: {},
    create: {
      employeeId: emp3.id,
      type: 'RESIGNATION',
      resignationDate: new Date('2026-07-01'),
      noticePeriodDays: 30,
      lastWorkingDay: new Date('2026-07-31'),
      reason: 'Pursuing higher education abroad.',
      status: 'CLEARANCE_IN_PROGRESS',
    },
  });

  // Clearance Tasks for Vikram
  const depts = ['IT', 'Store', 'Finance', 'Library'];
  for (const name of depts) {
    let dept = await prisma.department.findUnique({
      where: { name },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name },
      });
    }
    await prisma.clearanceTask.create({
      data: {
        exitProcessId: exit.id,
        departmentId: dept.id,
        taskDescription: `Complete ${name} check and sign-off`,
        status: name === 'IT' ? 'CLEARED' : 'PENDING',
        clearedAt: name === 'IT' ? new Date() : null,
        clearedBy: name === 'IT' ? 'IT Helpdesk' : null,
      },
    });
  }

  // Seed Holidays
  console.log('Seeding Holidays...');
  await prisma.holiday.upsert({
    where: { id: '1' },
    update: {},
    create: { id: '1', name: 'Independence Day', date: new Date('2026-08-15') },
  });
  await prisma.holiday.upsert({
    where: { id: '2' },
    update: {},
    create: { id: '2', name: 'Diwali', date: new Date('2026-11-08') },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
